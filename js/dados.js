/* =============================================================
   Sol na Conta – js/dados.js
   Aqui ficam SÓ os dados (nenhum cálculo, nenhum acesso à tela).
   Pense neste arquivo como a "tabela de preços pendurada na parede":
   se a tarifa mudar, você troca o número aqui e o resto do sistema
   continua funcionando sem mexer em mais nada.
   ============================================================= */

// Parâmetros técnicos e econômicos (Quadro 2 do relatório)
const PARAMETROS = {
  tarifa: 1.18,              // R$/kWh – tarifa residencial média com tributos (Cemig B1, 2026)
  disponibilidade: {         // kWh mínimos cobrados mesmo sem consumo (custo de disponibilidade)
    monofasica: 30,
    bifasica: 50,
    trifasica: 100
  },
  irradiacao: 5.1,           // kWh/m².dia – Região Metropolitana de BH (CRESESB SunData)
  taxaDesempenho: 0.80,      // perdas do sistema (calor, cabos, inversor, sujeira)
  potenciaPlaca: 550,        // Wp de cada placa
  precoPorWp: 2.45,          // R$/Wp – preço médio do sistema instalado
  fatorCompensacao: 0.90,    // efeito simplificado do Fio B (Lei 14.300/2022)
  horizonteAnos: 5           // usado na comparação do motor de regras
};

// Parâmetros EXTRAS (não mudam os números da Opção B, só explicam melhor o resultado).
// Ficam separados do PARAMETROS para os valores oficiais de teste continuarem intactos.
const PARAMETROS_EXTRAS = {
  areaPorPlaca: 2.6,         // m² que cada placa de 550 Wp ocupa no telhado (2,28 m × 1,13 m + folga)
  bateriaUtil: 0.90,         // só 90% da bateria pode ser usada sem estragá-la (profundidade de descarga)
  // Como uma casa típica gasta energia ao longo do dia (peso de cada hora, 0h a 23h).
  // Pouco de madrugada, um pico de manhã e o maior pico à noite (banho, janta, TV).
  pesoConsumoHora: [
    2, 1.6, 1.4, 1.4, 1.5, 2.2,   // 0h–5h  madrugada
    3.4, 4.2, 3.6, 3.2, 3.2, 3.6, // 6h–11h manhã
    4, 3.6, 3.2, 3.2, 3.6, 4.6,   // 12h–17h tarde
    7.2, 8, 7, 5.6, 4.2, 3        // 18h–23h noite (horário de pico)
  ],
  nascerDoSol: 6,            // hora em que as placas começam a gerar
  porDoSol: 18               // hora em que param
};

// Bandeiras tarifárias (ANEEL). Analogia: é como o "preço da gasolina"
// da energia. Quando chove pouco, as usinas mais caras ligam e a
// bandeira muda de cor, somando um valor extra a cada kWh consumido.
// adicional = R$ por kWh (ANEEL, valores vigentes em 2026: R$ 1,885 / 4,463 / 7,877 a cada 100 kWh).
// Simplificação: somamos o adicional à tarifa sem recalcular os tributos.
const BANDEIRAS = [
  { id: "verde",     nome: "Verde",      adicional: 0,       quando: "Chuva boa: as hidrelétricas dão conta" },
  { id: "amarela",   nome: "Amarela",    adicional: 0.01885, quando: "Chuva abaixo do normal" },
  { id: "vermelha1", nome: "Vermelha 1", adicional: 0.04463, quando: "Seca: usinas térmicas mais caras ligadas" },
  { id: "vermelha2", nome: "Vermelha 2", adicional: 0.07877, quando: "Seca forte: quase todas as térmicas ligadas" }
];

// Faixas de CEP atendidas no protótipo (só números, sem o hífen).
// Nesta versão só cobrimos a Cemig (Minas Gerais).
const FAIXA_CEP = { inicio: 30000000, fim: 39999999, distribuidora: "Cemig", estado: "MG" };

// Empresas de energia solar por assinatura (Opção A).
// desconto = porcentagem sobre a conta (0.16 = 16%)
// faturaMinima = valor mínimo da conta (R$) para poder assinar
const EMPRESAS = [
  {
    nome: "Cemig SIM",
    desconto: 0.16,
    faturaMinima: 160,
    site: "https://www.cemigsim.com.br"
  },
  {
    nome: "Bulbe",
    desconto: 0.15,          // TODO: valor de referência a confirmar pela equipe
    faturaMinima: 200,       // TODO: valor de referência a confirmar pela equipe
    site: "https://www.bulbe.com.br"
  },
  {
    nome: "SolarCoop MG",    // empresa FICTÍCIA, criada só para o protótipo
    desconto: 0.12,
    faturaMinima: 180,
    site: "#"
  }
];

// Itens da vitrine (preços ilustrativos – não são ofertas reais)
const AVISO_VITRINE = "Preços ilustrativos para fins acadêmicos";

const VITRINE = [
  // Placas solares 550 Wp
  { nome: "Placa solar 550 Wp monocristalina",       categoria: "novo",           preco: 890,  potencia: "550 Wp",  loja: "Loja Sol Forte" },
  { nome: "Placa solar 550 Wp (seminova)",           categoria: "usado",          preco: 560,  potencia: "550 Wp",  loja: "Brechó Solar BH" },
  { nome: "Placa solar 550 Wp revisada c/ garantia", categoria: "recondicionado", preco: 690,  potencia: "550 Wp",  loja: "ReEnergia MG" },
  // Inversores
  { nome: "Inversor on-grid 3 kW",                   categoria: "novo",           preco: 3200, potencia: "3 kW",    loja: "Loja Sol Forte" },
  { nome: "Inversor on-grid 5 kW (usado)",           categoria: "usado",          preco: 2600, potencia: "5 kW",    loja: "Brechó Solar BH" },
  { nome: "Microinversor 2 kW revisado",             categoria: "recondicionado", preco: 1900, potencia: "2 kW",    loja: "ReEnergia MG" },
  // Kits completos
  { nome: "Kit 2,20 kWp (4 placas + inversor)",      categoria: "novo",           preco: 5390, potencia: "2,20 kWp", loja: "Loja Sol Forte" },
  { nome: "Kit 3,85 kWp (7 placas + inversor)",      categoria: "novo",           preco: 9430, potencia: "3,85 kWp", loja: "Casa do Painel" },
  { nome: "Kit 1,10 kWp recondicionado",             categoria: "recondicionado", preco: 2100, potencia: "1,10 kWp", loja: "ReEnergia MG" }
];
