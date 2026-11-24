/* =============================================================
   EcoWatt – js/calculo.js
   Funções PURAS de cálculo: recebem números e devolvem números.
   Este arquivo NÃO mexe na tela (DOM). Funciona como uma
   calculadora: você aperta os botões (entradas) e ela devolve o
   resultado, sem saber em que página está sendo usada.
   Depende de: js/dados.js (carregar ANTES deste arquivo).
   ============================================================= */

/* ---------- Utilidades ---------- */

// Formata um número como dinheiro: 9432.5 -> "R$ 9.432,50"
const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function formatarMoeda(valor) {
  return formatadorMoeda.format(valor);
}

// Formata um número com casas decimais no padrão brasileiro: 3.85 -> "3,85"
function formatarNumero(valor, casas) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/* ---------- CEP ---------- */

// Recebe o CEP só com dígitos ("30130010") e diz se está na área atendida.
// (A checagem de CEP incompleto fica no app.js.)
function cepAtendido(cepSoDigitos) {
  const numero = Number(String(cepSoDigitos).replace(/\D/g, ""));
  return numero >= FAIXA_CEP.inicio && numero <= FAIXA_CEP.fim;
}

/* ---------- Consumo ---------- */

// consumo (kWh/mês) = valorConta / tarifa
function calcularConsumo(valorConta) {
  return valorConta / PARAMETROS.tarifa;
}

/* ---------- OPÇÃO A: energia por assinatura ---------- */

// Calcula, para CADA empresa, se o cliente pode assinar e quanto economiza.
// Devolve { empresas: [...], melhor: empresa elegível de maior economia ou null }
function calcularOpcaoA(valorConta) {
  const empresas = EMPRESAS.map(empresa => {
    const elegivel = valorConta >= empresa.faturaMinima;
    const economiaMensalA = elegivel ? valorConta * empresa.desconto : 0;
    return {
      nome: empresa.nome,
      site: empresa.site,
      desconto: empresa.desconto,
      faturaMinima: empresa.faturaMinima,
      elegivel: elegivel,
      economiaMensal: economiaMensalA,
      economia12m: economiaMensalA * 12
    };
  });
  return { empresas: empresas, melhor: melhorEmpresa(empresas) };
}

// Entre as empresas elegíveis, devolve a que dá MAIS economia (ou null).
function melhorEmpresa(empresas) {
  const elegiveis = empresas.filter(e => e.elegivel);
  if (elegiveis.length === 0) return null;
  return elegiveis.reduce((melhor, atual) =>
    atual.economiaMensal > melhor.economiaMensal ? atual : melhor
  );
}

/* ---------- OPÇÃO B: geração própria (placas no telhado) ---------- */

function calcularOpcaoB(valorConta, tipoLigacao) {
  const p = PARAMETROS;
  const consumo = calcularConsumo(valorConta);

  // A distribuidora sempre cobra um mínimo (disponibilidade); esse pedaço
  // as placas não conseguem "apagar" da conta, então não compensamos.
  const energiaCompensar = Math.max(consumo - p.disponibilidade[tipoLigacao], 0);

  // Quanto 1 kWp de placas gera por mês em BH: 5,1 × 30 × 0,80 = 122,4 kWh
  const geracaoPorKwp = p.irradiacao * 30 * p.taxaDesempenho;

  const potenciaKwp = energiaCompensar / geracaoPorKwp;
  const numPlacas = Math.ceil(potenciaKwp * 1000 / p.potenciaPlaca);  // arredonda pra cima: não existe meia placa
  const potenciaInstalada = numPlacas * p.potenciaPlaca / 1000;       // kWp
  const investimento = numPlacas * p.potenciaPlaca * p.precoPorWp;
  const economiaMensalB = energiaCompensar * p.tarifa * p.fatorCompensacao;
  const paybackAnos = economiaMensalB > 0 ? investimento / (economiaMensalB * 12) : Infinity;

  return {
    consumo,
    energiaCompensar,
    geracaoPorKwp,
    potenciaKwp,
    numPlacas,
    potenciaInstalada,
    investimento,
    economiaMensal: economiaMensalB,
    economia12m: economiaMensalB * 12,
    paybackAnos
  };
}

/* ---------- MOTOR DE REGRAS ---------- */

// Decide qual opção recomendar. Devolve { opcao: "A" | "B" | null, motivo }
// e um texto explicando o motivo. As duas opções SEMPRE são mostradas;
// a recomendação só ganha o selo "Recomendado".
function recomendar(opcaoA, opcaoB, imovel) {
  const melhorA = opcaoA.melhor;
  const meses = PARAMETROS.horizonteAnos * 12;   // 5 anos = 60 meses

  // Regra 1: imóvel alugado -> não dá para instalar placas
  if (imovel === "alugado") {
    if (melhorA) {
      return { opcao: "A", motivo: "Imóvel alugado: a assinatura não exige obra nem investimento." };
    }
    return { opcao: null, motivo: "Nenhuma opção disponível: imóvel alugado e conta abaixo da fatura mínima das empresas de assinatura." };
  }

  // Regra 2: nenhuma empresa aceita essa conta -> geração própria
  if (!melhorA) {
    return { opcao: "B", motivo: "Sua conta está abaixo da fatura mínima das empresas de assinatura." };
  }

  // Regra 3: compara o ganho em 5 anos
  const ganhoA = melhorA.economiaMensal * meses;
  const ganhoB = opcaoB.economiaMensal * meses - opcaoB.investimento;

  if (ganhoB > ganhoA) {
    return { opcao: "B", motivo: "Em " + PARAMETROS.horizonteAnos + " anos, a geração própria rende mais, mesmo descontando o investimento.", ganhoA, ganhoB };
  }
  return { opcao: "A", motivo: "Em " + PARAMETROS.horizonteAnos + " anos, a assinatura rende mais.", ganhoA, ganhoB };
}

/* ---------- Gráfico: economia acumulada ---------- */

// Monta os pontos do gráfico (ano 0 a 5) para as duas opções.
// Na opção B o valor começa negativo (investimento) e vai subindo.
function economiaAcumulada(opcaoA, opcaoB) {
  const melhorA = opcaoA.melhor;
  const anos = [], acumuladoA = [], acumuladoB = [];
  for (let ano = 0; ano <= PARAMETROS.horizonteAnos; ano++) {
    anos.push(ano);
    acumuladoA.push(melhorA ? melhorA.economiaMensal * 12 * ano : 0);
    acumuladoB.push(opcaoB.economiaMensal * 12 * ano - opcaoB.investimento);
  }
  return { anos, acumuladoA, acumuladoB };
}

/* ---------- Função principal ---------- */

// Junta tudo: é a única função que o app.js precisa chamar.
// tipoLigacao: "monofasica" | "bifasica" | "trifasica"
// imovel: "proprio" | "alugado"
function simular(valorConta, tipoLigacao, imovel) {
  const consumo = calcularConsumo(valorConta);
  const opcaoA = calcularOpcaoA(valorConta);
  const opcaoB = calcularOpcaoB(valorConta, tipoLigacao);
  const regra = recomendar(opcaoA, opcaoB, imovel);
  return {
    consumo,
    opcaoA,                          // { empresas, melhor }
    opcaoB,
    recomendacao: regra.opcao,       // "A" | "B" | null
    motivo: regra.motivo,
    grafico: economiaAcumulada(opcaoA, opcaoB)   // { anos, acumuladoA, acumuladoB } para o Chart.js
  };
}
