/* =============================================================
   Sol na Conta – js/calculo.js
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

/* ---------- EXTRA 1: quanto do consumo o sol cobre (e o telhado) ---------- */

// Analogia: a conta de luz é uma pizza. O sol pode comer quase toda,
// mas uma fatia (o mínimo de disponibilidade) é sempre da Cemig.
// areaTelhado é opcional (m²). Se vier, conferimos se as placas cabem.
// NÃO altera a Opção B: só ajuda a explicar o resultado.
function calcularCobertura(opcaoB, areaTelhado) {
  const ex = PARAMETROS_EXTRAS;
  const temArea = areaTelhado > 0;
  const placasQueCabem = temArea ? Math.floor(areaTelhado / ex.areaPorPlaca) : opcaoB.numPlacas;
  const placasUsadas = Math.min(placasQueCabem, opcaoB.numPlacas);

  // geração mensal das placas que de fato vão para o telhado
  const geracaoMensal = placasUsadas * PARAMETROS.potenciaPlaca / 1000 * opcaoB.geracaoPorKwp;
  const kwhDoSol = Math.min(geracaoMensal, opcaoB.energiaCompensar);   // o que o sol "apaga" da conta
  const kwhDaRede = Math.max(opcaoB.consumo - kwhDoSol, 0);              // o que continua vindo da Cemig
  const percentualSol = opcaoB.consumo > 0 ? kwhDoSol / opcaoB.consumo * 100 : 0;

  return {
    temArea,
    areaNecessaria: opcaoB.numPlacas * ex.areaPorPlaca,
    placasQueCabem,
    placasUsadas,
    cabeTudo: placasUsadas >= opcaoB.numPlacas,
    geracaoMensal,
    kwhDoSol,
    kwhDaRede,
    percentualSol,
    // se o telhado for pequeno, a economia real fica menor que a do card B
    economiaComTelhado: kwhDoSol * PARAMETROS.tarifa * PARAMETROS.fatorCompensacao
  };
}

/* ---------- EXTRA 2: um dia de sol (excedente e bateria) ---------- */

// Analogia: as placas são uma torneira que só abre de dia, e a casa é
// um copo que bebe mais à noite. Ao meio-dia a torneira enche mais do que
// o copo bebe (EXCEDENTE); à noite o copo fica com sede (FALTA).
// Hoje a sobra vai para a rede e vira crédito; uma bateria seria uma
// "garrafa" para guardar essa sobra e usar à noite.
function simularDiaDeSol(geracaoMensal, consumoMensal) {
  const ex = PARAMETROS_EXTRAS;
  const horasDeSol = ex.porDoSol - ex.nascerDoSol;

  // Curva do sol em forma de "morro": começa em zero, sobe até o meio-dia e desce
  const pesoSol = [];
  for (let h = 0; h < 24; h++) {
    const dentro = h >= ex.nascerDoSol && h < ex.porDoSol;
    pesoSol.push(dentro ? Math.sin(Math.PI * (h + 0.5 - ex.nascerDoSol) / horasDeSol) : 0);
  }
  const somaSol = pesoSol.reduce((a, b) => a + b, 0);
  const somaConsumo = ex.pesoConsumoHora.reduce((a, b) => a + b, 0);

  const geracaoDia = geracaoMensal / 30;
  const consumoDia = consumoMensal / 30;
  const geracaoHora = [], consumoHora = [];
  let excedente = 0, falta = 0;

  for (let h = 0; h < 24; h++) {
    const g = geracaoDia * pesoSol[h] / somaSol;
    const c = consumoDia * ex.pesoConsumoHora[h] / somaConsumo;
    geracaoHora.push(g);
    consumoHora.push(c);
    excedente += Math.max(g - c, 0);   // sobrou nesta hora
    falta += Math.max(c - g, 0);       // faltou nesta hora
  }

  // A bateria só precisa guardar o que vai ser usado depois (o menor dos dois)
  const guardar = Math.min(excedente, falta);
  // arredonda para cima de 0,5 em 0,5 kWh (tamanhos comuns de bateria)
  const bateriaKwh = guardar > 0 ? Math.ceil(guardar / ex.bateriaUtil * 2) / 2 : 0;

  return {
    geracaoHora,
    consumoHora,
    geracaoDia,
    consumoDia,
    excedente,                                      // kWh/dia que sobram de dia
    falta,                                          // kWh/dia que faltam (noite)
    usadoNaHora: geracaoDia - excedente,            // energia do sol usada na mesma hora
    percentualExcedente: geracaoDia > 0 ? excedente / geracaoDia * 100 : 0,
    bateriaKwh
  };
}

/* ---------- EXTRA 3: calculadora de tarifa (bandeiras) ---------- */

// Recalcula conta e economias para uma bandeira. O valor digitado pela
// pessoa é tratado como a conta em bandeira VERDE; por isso, na verde,
// os números são exatamente os dos cards A e B (os testes não mudam).
// A elegibilidade das empresas continua a mesma do card A.
function simularBandeira(resultado, idBandeira) {
  const bandeira = BANDEIRAS.find(b => b.id === idBandeira) || BANDEIRAS[0];
  const tarifaComBandeira = PARAMETROS.tarifa + bandeira.adicional;
  const contaVerde = resultado.consumo * PARAMETROS.tarifa;
  const conta = resultado.consumo * tarifaComBandeira;
  const melhorA = resultado.opcaoA.melhor;
  const b = resultado.opcaoB;

  const economiaA = melhorA ? conta * melhorA.desconto : null;          // desconto vale sobre a conta toda
  const economiaB = b.energiaCompensar * tarifaComBandeira * PARAMETROS.fatorCompensacao;
  return {
    bandeira,
    tarifaComBandeira,
    conta,
    acrescimo: conta - contaVerde,                     // quanto a bandeira soma na conta
    economiaA,
    contaComAssinatura: economiaA === null ? null : conta - economiaA,
    economiaB,
    contaComPlacas: conta - economiaB,                 // o que sobra para pagar com placas
    paybackB: economiaB > 0 ? b.investimento / (economiaB * 12) : Infinity
  };
}

/* ---------- EXTRA 4: impacto ambiental ---------- */

// Analogia: cada kWh que vem do sol é um kWh que uma usina térmica não
// precisou queimar. Somamos esses kWh no ano e convertemos em CO₂ e em
// "árvores trabalhando" para ficar fácil de imaginar.
// energiaMes = kWh/mês que passam a vir de fonte solar.
function calcularImpacto(energiaMes) {
  const ex = PARAMETROS_EXTRAS;
  const kwhAno = energiaMes * 12;
  const co2Ano = kwhAno * ex.fatorEmissao;                 // kg de CO₂ por ano
  return {
    kwhAno,
    co2Ano,
    arvores: Math.round(co2Ano / ex.co2PorArvoreAno),       // árvores fixando CO₂ durante 1 ano
    co2VidaUtil: co2Ano * ex.vidaUtilAnos,                   // kg em 25 anos
    kwhVidaUtil: kwhAno * ex.vidaUtilAnos
  };
}

/* ---------- Função principal ---------- */

// Junta tudo: é a única função que o app.js precisa chamar.
// tipoLigacao: "monofasica" | "bifasica" | "trifasica"
// imovel: "proprio" | "alugado"
// areaTelhado: m² (opcional; 0 ou vazio = não informado)
function simular(valorConta, tipoLigacao, imovel, areaTelhado) {
  const consumo = calcularConsumo(valorConta);
  const opcaoA = calcularOpcaoA(valorConta);
  const opcaoB = calcularOpcaoB(valorConta, tipoLigacao);
  const regra = recomendar(opcaoA, opcaoB, imovel);
  const cobertura = calcularCobertura(opcaoB, areaTelhado || 0);
  return {
    consumo,
    opcaoA,                          // { empresas, melhor }
    opcaoB,
    recomendacao: regra.opcao,       // "A" | "B" | null
    motivo: regra.motivo,
    grafico: economiaAcumulada(opcaoA, opcaoB),   // { anos, acumuladoA, acumuladoB } para o Chart.js
    cobertura,                                    // extra: % do consumo coberto pelo sol + telhado
    dia: simularDiaDeSol(cobertura.geracaoMensal, consumo),  // extra: excedente e bateria
    // extra: impacto ambiental. Simplificação: nas duas opções a energia limpa
    // que passa a abastecer a casa é a energia a compensar (consumo − mínimo).
    impacto: calcularImpacto(opcaoB.energiaCompensar)
  };
}
