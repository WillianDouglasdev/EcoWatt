/* =========================================================
   Sol na Conta – app.js
   Papel deste arquivo: ser o "garçom" do site.
   Ele pega o pedido (formulário), leva para a cozinha
   (funções de js/calculo.js) e traz o prato pronto (resultados na tela).
   Aqui NÃO tem fórmula: as contas ficam todas em calculo.js.
   ========================================================= */

// ---------- Elementos da página que vamos usar ----------
const formulario = document.getElementById('formulario');
const campoCep = document.getElementById('cep');
const campoConta = document.getElementById('valorConta');
const campoLigacao = document.getElementById('tipoLigacao');
const campoArea = document.getElementById('areaTelhado');
const secaoResultados = document.getElementById('resultados');

let graficoAtual = null;    // guarda o gráfico para poder apagar antes de desenhar outro
let graficoDiaAtual = null; // mesmo papel, para o gráfico "Um dia de sol"

// ---------- Ícones ----------
// "Carimba" um ícone que está guardado no index.html (<symbol id="i-nome">)
function icone(nome) {
  return '<svg class="icone" aria-hidden="true"><use href="#i-' + nome + '"/></svg>';
}

// ---------- Formatação ----------
// Usa formatarMoeda do calculo.js se existir; senão, formata aqui mesmo.
function moeda(valor) {
  if (typeof formatarMoeda === 'function') return formatarMoeda(valor);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Número com casas decimais no padrão brasileiro (vírgula)
function numero(valor, casas) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// ---------- Máscara do CEP: digita 30140071 e vira 30140-071 ----------
campoCep.addEventListener('input', function () {
  let digitos = campoCep.value.replace(/\D/g, '').slice(0, 8);
  if (digitos.length > 5) digitos = digitos.slice(0, 5) + '-' + digitos.slice(5);
  campoCep.value = digitos;
});

// ---------- Validação ----------
function mostrarErro(campo, mensagem) {
  document.getElementById('erro-' + campo.id).textContent = mensagem;
  campo.classList.toggle('invalido', mensagem !== '');
}

// Confere se o CEP está na área atendida (Cemig / MG: 30000-000 a 39999-999)
function cepNaAreaAtendida(cepDigitos) {
  if (typeof cepAtendido === 'function') return cepAtendido(cepDigitos);
  const numeroCep = Number(cepDigitos);
  return numeroCep >= FAIXA_CEP.inicio && numeroCep <= FAIXA_CEP.fim;
}

// Devolve true se está tudo certo; senão mostra as mensagens e devolve false
function validarFormulario() {
  let valido = true;

  // CEP
  const cepDigitos = campoCep.value.replace(/\D/g, '');
  if (cepDigitos.length !== 8) {
    mostrarErro(campoCep, 'CEP incompleto. Digite os 8 números.');
    valido = false;
  } else if (!cepNaAreaAtendida(cepDigitos)) {
    mostrarErro(campoCep, 'Por enquanto o Sol na Conta atende só Minas Gerais (CEP 30000-000 a 39999-999).');
    valido = false;
  } else {
    mostrarErro(campoCep, '');
  }

  // Valor da conta
  const valorConta = Number(campoConta.value);
  if (campoConta.value === '' || isNaN(valorConta) || valorConta <= 0) {
    mostrarErro(campoConta, 'Informe um valor de conta maior que zero.');
    valido = false;
  } else {
    mostrarErro(campoConta, '');
  }

  // Área do telhado (opcional): vazio pode, número negativo não
  const area = Number(campoArea.value);
  if (campoArea.value !== '' && (isNaN(area) || area < 0)) {
    mostrarErro(campoArea, 'Informe a área em m² (ou deixe em branco).');
    valido = false;
  } else {
    mostrarErro(campoArea, '');
  }

  return valido;
}

// ---------- Montagem do card da Opção A (assinatura) ----------
function montarCardA(opcaoA) {
  let html = '';
  if (opcaoA.melhor) {
    html += '<p class="economia-card">' + moeda(opcaoA.melhor.economiaMensal) + ' <small>/mês</small></p>';
    html += '<p class="dica">' + moeda(opcaoA.melhor.economia12m) + ' em 12 meses com ' + opcaoA.melhor.nome + '</p>';
  } else {
    html += '<p class="economia-card">– <small>sem empresa disponível</small></p>';
    html += '<p class="dica">Sua conta está abaixo da fatura mínima exigida pelas empresas.</p>';
  }

  // Lista todas as empresas, mostrando quem aceita e quem não aceita
  // Cada linha: nome + etiqueta à esquerda, economia à direita (como um extrato)
  html += '<div class="lista-empresas">';
  opcaoA.empresas.forEach(function (empresa) {
    const ehMelhor = opcaoA.melhor && empresa.nome === opcaoA.melhor.nome;
    let classe = 'empresa';
    if (!empresa.elegivel) classe += ' inelegivel';
    if (ehMelhor) classe += ' melhor';
    const etiqueta = empresa.elegivel
      ? '<span class="etiqueta">' + numero(empresa.desconto * 100, 0) + '% off</span>'
      : '<span class="etiqueta nao">Conta mín. ' + moeda(empresa.faturaMinima) + '</span>';
    const valor = empresa.elegivel
      ? '<strong class="empresa-valor">' + moeda(empresa.economiaMensal) + '<small>/mês</small></strong>'
      : '<strong class="empresa-valor">–</strong>';
    const link = empresa.site ? '<a href="' + empresa.site + '" target="_blank" rel="noopener">Ver site ' + icone('externo') + '</a>' : '';
    html += '<div class="' + classe + '">' +
              '<div><span class="nome">' + empresa.nome + (ehMelhor ? icone('estrela') : '') + '</span>' + etiqueta +
              '<span class="empresa-link">' + (empresa.elegivel ? link : 'Não disponível para o seu valor de conta') + '</span></div>' +
              valor +
            '</div>';
  });
  html += '</div>';

  document.getElementById('conteudo-a').innerHTML = html;
}

// ---------- Montagem do card da Opção B (placas) ----------
function montarCardB(opcaoB) {
  const anos = opcaoB.paybackAnos;
  const textoPayback = isFinite(anos) ? numero(anos, 1) + (anos < 2 ? ' ano' : ' anos') : '–';

  document.getElementById('conteudo-b').innerHTML =
    '<p class="economia-card">' + moeda(opcaoB.economiaMensal) + ' <small>/mês</small></p>' +
    '<p class="dica">' + moeda(opcaoB.economiaMensal * 12) + ' em 12 meses</p>' +
    '<ul class="lista-dados">' +
      '<li><span>Investimento</span><span>' + moeda(opcaoB.investimento) + '</span></li>' +
      '<li><span>Retorno do investimento</span><span>' + textoPayback + '</span></li>' +
      '<li><span>Nº de placas (550 Wp)</span><span>' + opcaoB.numPlacas + '</span></li>' +
      '<li><span>Potência instalada</span><span>' + numero(opcaoB.potenciaInstalada, 2) + ' kWp</span></li>' +
      '<li><span>Energia a compensar</span><span>' + numero(opcaoB.energiaCompensar, 0) + ' kWh/mês</span></li>' +
    '</ul>';
}

// ---------- Selo "Recomendado" ----------
function marcarRecomendada(recomendacao) {
  ['a', 'b'].forEach(function (letra) {
    const card = document.getElementById('card-' + letra);
    const ehRecomendada = recomendacao === letra.toUpperCase();
    card.classList.toggle('recomendada', ehRecomendada);
    card.querySelector('.selo').hidden = !ehRecomendada;
  });
}

// ---------- Destaque principal (economia em R$) ----------
function montarDestaque(resultado) {
  const titulo = document.getElementById('destaque-titulo');
  const valor = document.getElementById('destaque-valor');
  const sub = document.getElementById('destaque-sub');

  if (resultado.recomendacao === 'A') {
    titulo.textContent = 'Com a assinatura solar você economiza';
    valor.textContent = moeda(resultado.opcaoA.melhor.economiaMensal);
    sub.textContent = 'por mês · ' + moeda(resultado.opcaoA.melhor.economia12m) + ' em 12 meses';
  } else if (resultado.recomendacao === 'B') {
    titulo.textContent = 'Com placas no telhado você economiza';
    valor.textContent = moeda(resultado.opcaoB.economiaMensal);
    sub.textContent = 'por mês · ' + moeda(resultado.opcaoB.economiaMensal * 12) + ' em 12 meses';
  } else {
    titulo.textContent = 'Nenhuma opção disponível agora';
    valor.textContent = moeda(0);
    sub.textContent = 'veja o aviso abaixo';
  }
}

// Eixo do gráfico mais limpo: "R$ 8 mil" em vez de "R$ 8.000,00"
function eixoCurto(valor) {
  if (valor === 0) return 'R$ 0';
  if (Math.abs(valor) >= 1000) return 'R$ ' + numero(valor / 1000, 0) + ' mil';
  return moeda(valor);
}

// ---------- Gráfico (Chart.js): ganho acumulado ano a ano ----------
// Analogia: é como comparar dois cofrinhos. No A você começa do zero e enche
// um pouco por mês. No B você começa "devendo" o investimento, mas enche mais rápido.
function desenharGrafico(resultado) {
  const canvas = document.getElementById('grafico');

  // Se o Chart.js não carregou (sem internet), avisa em vez de quebrar a página
  if (typeof Chart === 'undefined') {
    document.getElementById('aviso-grafico').textContent = 'Não foi possível carregar o gráfico (verifique a internet).';
    return;
  }

  Chart.defaults.font.family = 'system-ui, "Segoe UI", Arial, sans-serif'; // mesma fonte do site
  Chart.defaults.color = '#5F7380';

  const horizonte = (typeof PARAMETROS !== 'undefined' && PARAMETROS.horizonteAnos) || 5;
  const rotulos = [];
  const linhaA = [];
  const linhaB = [];
  const mensalA = resultado.opcaoA.melhor ? resultado.opcaoA.melhor.economiaMensal : null;

  for (let ano = 0; ano <= horizonte; ano++) {
    rotulos.push(ano === 0 ? 'Hoje' : 'Ano ' + ano);
    if (mensalA !== null) linhaA.push(Number((mensalA * 12 * ano).toFixed(2)));
    linhaB.push(Number((resultado.opcaoB.economiaMensal * 12 * ano - resultado.opcaoB.investimento).toFixed(2)));
  }

  const conjuntos = [];
  if (mensalA !== null) {
    conjuntos.push({ label: 'A – Assinatura (' + resultado.opcaoA.melhor.nome + ')', data: linhaA,
      borderColor: '#F9A825', backgroundColor: 'rgba(249, 168, 37, 0.12)', fill: 'origin',
      borderWidth: 3, tension: 0.3, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#F9A825' });
  }
  conjuntos.push({ label: 'B – Placas no telhado', data: linhaB,
    borderColor: '#2E7D32', backgroundColor: 'rgba(46, 125, 50, 0.12)', fill: 'origin',
    borderWidth: 3, tension: 0.3, pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: '#2E7D32' });

  if (graficoAtual) graficoAtual.destroy(); // apaga o gráfico anterior

  graficoAtual = new Chart(canvas, {
    type: 'line',
    data: { labels: rotulos, datasets: conjuntos },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false }, // passa o mouse e vê as duas linhas juntas
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 18, font: { weight: '600' } } },
        tooltip: { backgroundColor: '#263238', padding: 12, cornerRadius: 10, boxPadding: 4, usePointStyle: true,
          callbacks: { label: function (item) { return item.dataset.label + ': ' + moeda(item.parsed.y); } } }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: function (ctx) { return ctx.tick && ctx.tick.value === 0 ? '#90A4AE' : '#ECEFF1'; } }, ticks: { callback: function (v) { return eixoCurto(v); } } }
      }
    }
  });
}

// ---------- EXTRA: quanto do consumo o sol cobre ----------
function montarCobertura(resultado) {
  const c = resultado.cobertura;
  const pctSol = Math.round(c.percentualSol);
  document.getElementById('fatia-sol').style.width = c.percentualSol + '%';
  document.getElementById('fatia-rede').style.width = (100 - c.percentualSol) + '%';
  document.getElementById('barra-pizza').setAttribute('aria-label', 'O sol cobre ' + pctSol + '% do consumo');
  document.getElementById('kwh-sol').textContent = numero(c.kwhDoSol, 0) + ' kWh (' + pctSol + '%)';
  document.getElementById('kwh-rede').textContent = numero(c.kwhDaRede, 0) + ' kWh (' + (100 - pctSol) + '%)';

  const minimo = PARAMETROS.disponibilidade[campoLigacao.value];
  document.getElementById('texto-cobertura').textContent = c.cabeTudo
    ? 'As placas cobrem tudo o que dá para compensar. Os ' + minimo + ' kWh restantes são o mínimo que a distribuidora sempre cobra (custo de disponibilidade), com ou sem placas.'
    : 'Com o telhado informado, o sol cobre só parte do que poderia. Veja o aviso abaixo.';

  // Aviso do telhado (só aparece se a pessoa informou a área)
  const aviso = document.getElementById('aviso-telhado');
  if (!c.temArea) {
    aviso.hidden = true;
  } else if (c.cabeTudo) {
    aviso.textContent = 'Cabe! As ' + resultado.opcaoB.numPlacas + ' placas ocupam cerca de ' + numero(c.areaNecessaria, 1) + ' m² do seu telhado.';
    aviso.classList.add('aviso-ok');
    aviso.hidden = false;
  } else {
    aviso.textContent = 'O ideal são ' + resultado.opcaoB.numPlacas + ' placas (' + numero(c.areaNecessaria, 1) + ' m²), mas cabem ' + c.placasQueCabem +
      '. Com ' + c.placasUsadas + ' placa(s) a economia fica perto de ' + moeda(c.economiaComTelhado) + '/mês' +
      // se a economia cair mais de 15%, vale lembrar da assinatura (não precisa de telhado)
      (c.economiaComTelhado < resultado.opcaoB.economiaMensal * 0.85 ? '. A assinatura (Opção A) pode compensar mais.' : ', quase o mesmo do ideal.');
    aviso.classList.remove('aviso-ok');
    aviso.hidden = false;
  }
}

// ---------- EXTRA: um dia de sol ----------
function montarDiaDeSol(resultado) {
  const d = resultado.dia;
  document.getElementById('dia-excedente').textContent = numero(d.excedente, 1) + ' kWh';
  document.getElementById('dia-excedente-pct').textContent = numero(d.percentualExcedente, 0) + '% do que as placas geram';
  document.getElementById('dia-falta').textContent = numero(d.falta, 1) + ' kWh';
  document.getElementById('dia-bateria').textContent = d.bateriaKwh > 0 ? numero(d.bateriaKwh, 1) + ' kWh' : '–';

  if (typeof Chart === 'undefined') return; // sem internet: os números acima já explicam

  const horas = [];
  for (let h = 0; h < 24; h++) horas.push(h + 'h');
  const arredondar = function (lista) { return lista.map(function (v) { return Number(v.toFixed(2)); }); };

  if (graficoDiaAtual) graficoDiaAtual.destroy();
  graficoDiaAtual = new Chart(document.getElementById('grafico-dia'), {
    data: {
      labels: horas,
      datasets: [
        { type: 'bar', label: 'Geração das placas', data: arredondar(d.geracaoHora), backgroundColor: 'rgba(249, 168, 37, 0.75)', borderRadius: 4, order: 2 },
        { type: 'line', label: 'Consumo da casa', data: arredondar(d.consumoHora), borderColor: '#1B5E20', backgroundColor: '#1B5E20',
          borderWidth: 3, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, order: 1 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 18, font: { weight: '600' } } },
        tooltip: { backgroundColor: '#263238', padding: 12, cornerRadius: 10, boxPadding: 4, usePointStyle: true,
          callbacks: { label: function (item) { return item.dataset.label + ': ' + numero(item.parsed.y, 2) + ' kWh'; } } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { grid: { color: '#ECEFF1' }, ticks: { callback: function (v) { return numero(v, 1) + ' kWh'; } } }
      }
    }
  });
}

// ---------- EXTRA: calculadora de tarifa (bandeiras) ----------
// Analogia: o semáforo da conta de luz. Verde = preço normal; amarela e
// vermelhas = cada kWh fica mais caro. Quem tem placas sente menos, porque
// a energia que o sol gera não passa pela bandeira.
let bandeiraAtual = 'verde';
let resultadoAtual = null;   // última simulação (para a bandeira e os cenários)
let entradaAtual = null;     // dados digitados na última simulação

function montarSeletorBandeira() {
  document.getElementById('seletor-bandeira').innerHTML = BANDEIRAS.map(function (b) {
    return '<button type="button" role="radio" class="chip-bandeira chip-' + b.id + '" data-id="' + b.id + '" aria-checked="' + (b.id === bandeiraAtual) + '">' +
             '<span class="bolinha"></span>' + b.nome +
             '<small>' + (b.adicional > 0 ? '+' + moeda(b.adicional * 100) + '/100 kWh' : 'sem acréscimo') + '</small>' +
           '</button>';
  }).join('');
}

function atualizarBandeira() {
  if (!resultadoAtual) return;
  const x = simularBandeira(resultadoAtual, bandeiraAtual);
  const card = document.getElementById('card-bandeira');
  card.dataset.bandeira = bandeiraAtual; // o CSS usa isso para mudar a cor de destaque

  document.querySelectorAll('.chip-bandeira').forEach(function (botao) {
    botao.setAttribute('aria-checked', botao.dataset.id === bandeiraAtual);
  });
  document.getElementById('bandeira-quando').textContent = 'Bandeira ' + x.bandeira.nome.toLowerCase() + ': ' + x.bandeira.quando + '.';

  document.getElementById('band-conta').textContent = moeda(x.conta);
  document.getElementById('band-acrescimo').textContent = x.acrescimo > 0.005 ? '+' + moeda(x.acrescimo) + ' por causa da bandeira' : 'valor que você digitou';

  if (x.economiaA === null) {
    document.getElementById('band-a').textContent = '–';
    document.getElementById('band-a-sub').textContent = 'nenhuma empresa aceita essa conta';
  } else {
    document.getElementById('band-a').textContent = moeda(x.economiaA) + '/mês';
    document.getElementById('band-a-sub').textContent = 'você paga ' + moeda(x.contaComAssinatura);
  }
  document.getElementById('band-b').textContent = moeda(x.economiaB) + '/mês';
  document.getElementById('band-b-sub').textContent = 'você paga ' + moeda(x.contaComPlacas) + ' · retorno em ' + numero(x.paybackB, 1) + ' anos';

  // "Escada": a conta em cada bandeira, separando o que o sol paga do que sobra
  const todas = BANDEIRAS.map(function (b) { return simularBandeira(resultadoAtual, b.id); });
  const maior = todas[todas.length - 1].conta;
  document.getElementById('escada-bandeiras').innerHTML = todas.map(function (t) {
    const largura = t.conta / maior * 100;
    const pago = t.contaComPlacas / t.conta * 100;
    return '<div class="degrau' + (t.bandeira.id === bandeiraAtual ? ' ativo' : '') + '">' +
             '<span class="degrau-nome"><span class="bolinha b-' + t.bandeira.id + '"></span>' + t.bandeira.nome + '</span>' +
             '<div class="degrau-trilho"><div class="degrau-barra" style="width:' + largura + '%">' +
               '<i class="parte-paga" style="width:' + pago + '%"></i><i class="parte-sol"></i>' +
             '</div></div>' +
             '<strong>' + moeda(t.conta) + '</strong>' +
           '</div>';
  }).join('');

  atualizarAvisoGuardar();
}

document.getElementById('seletor-bandeira').addEventListener('click', function (evento) {
  const botao = evento.target.closest('.chip-bandeira');
  if (!botao) return;
  bandeiraAtual = botao.dataset.id;
  atualizarBandeira();
});

montarSeletorBandeira();

// ---------- EXTRA: comparar cenários ----------
// Analogia: duas fotos lado a lado. Cada "Guardar" tira uma foto da
// simulação atual; com duas fotos, a tabela mostra a diferença.
// Fica só na memória da página (nada é salvo no computador).
const cenarios = [null, null];
const NOMES_LIGACAO = { monofasica: 'Monofásica', bifasica: 'Bifásica', trifasica: 'Trifásica' };

function fotografarCenario() {
  const r = resultadoAtual;
  const x = simularBandeira(r, bandeiraAtual);
  const recomendada = r.recomendacao === 'A' ? 'Assinatura' : r.recomendacao === 'B' ? 'Placas' : 'Nenhuma';
  const economiaRecomendada = r.recomendacao === 'A' ? x.economiaA : r.recomendacao === 'B' ? x.economiaB : 0;
  return {
    entrada: entradaAtual.valorConta + '|' + entradaAtual.tipoLigacao + '|' + entradaAtual.imovel + '|' + entradaAtual.areaTelhado + '|' + bandeiraAtual,
    valorConta: entradaAtual.valorConta,
    ligacao: NOMES_LIGACAO[entradaAtual.tipoLigacao],
    imovel: entradaAtual.imovel === 'proprio' ? 'Próprio' : 'Alugado',
    bandeira: x.bandeira,
    conta: x.conta,
    consumo: r.consumo,
    recomendada,
    economiaRecomendada,
    economiaA: x.economiaA,
    economiaB: x.economiaB,
    investimento: r.opcaoB.investimento,
    numPlacas: r.opcaoB.numPlacas,
    paybackB: x.paybackB,
    percentualSol: r.cobertura.percentualSol,
    economia5anos: economiaRecomendada * 60 - (r.recomendacao === 'B' ? r.opcaoB.investimento : 0)
  };
}

// Evita guardar duas vezes exatamente a mesma simulação
function jaGuardado() {
  if (!resultadoAtual) return false;
  const chave = fotografarCenario().entrada;
  return cenarios.some(function (c) { return c && c.entrada === chave; });
}

function atualizarAvisoGuardar() {
  const botao = document.getElementById('btn-guardar');
  const repetido = jaGuardado();
  botao.disabled = repetido;
  botao.lastChild.textContent = repetido ? ' Cenário já guardado' : (cenarios[0] && cenarios[1] ? ' Trocar o cenário 2' : ' Guardar este cenário');
}

document.getElementById('btn-guardar').addEventListener('click', function () {
  if (!resultadoAtual || jaGuardado()) return;
  const vaga = cenarios[0] === null ? 0 : 1; // se as duas estão cheias, troca a segunda
  cenarios[vaga] = fotografarCenario();
  document.getElementById('aviso-guardado').textContent = vaga === 0
    ? 'Cenário 1 guardado. Agora mude algum dado no formulário, calcule de novo e guarde o cenário 2.'
    : 'Cenário 2 guardado. Veja a comparação abaixo.';
  montarCenarios();
});

document.getElementById('vagas-cenario').addEventListener('click', function (evento) {
  const botao = evento.target.closest('[data-remover]');
  if (botao) {
    cenarios[Number(botao.dataset.remover)] = null;
    if (cenarios[0] === null && cenarios[1] !== null) { cenarios[0] = cenarios[1]; cenarios[1] = null; } // sobe o que sobrou
    document.getElementById('aviso-guardado').textContent = '';
    montarCenarios();
    return;
  }
  if (evento.target.closest('.vaga-vazia')) document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
});

function montarCenarios() {
  document.getElementById('vagas-cenario').innerHTML = cenarios.map(function (c, i) {
    if (!c) {
      return '<button type="button" class="vaga vaga-vazia"><span class="vaga-numero">' + (i + 1) + '</span>' +
               '<strong>Cenário ' + (i + 1) + '</strong><span class="dica">' + (i === 0 ? 'Clique em "Guardar este cenário"' : 'Mude os dados e guarde outro') + '</span></button>';
    }
    return '<div class="vaga vaga-cheia">' +
             '<button type="button" class="vaga-remover" data-remover="' + i + '" aria-label="Remover cenário ' + (i + 1) + '">' + icone('x') + '</button>' +
             '<span class="vaga-numero">' + (i + 1) + '</span>' +
             '<p class="vaga-rotulo">Conta de ' + moeda(c.valorConta) + '</p>' +
             '<div class="vaga-tags"><span>' + c.ligacao + '</span><span>' + c.imovel + '</span><span class="tag-bandeira b-' + c.bandeira.id + '">' + c.bandeira.nome + '</span></div>' +
             '<p class="vaga-valor">' + moeda(c.economiaRecomendada) + '<small>/mês</small></p>' +
             '<p class="dica">economia com ' + c.recomendada.toLowerCase() + (c.recomendada === 'Nenhuma' ? ' opção disponível' : '') + '</p>' +
           '</div>';
  }).join('');
  montarComparacao();
  atualizarAvisoGuardar();
}

// Tabela lado a lado. melhor: 'maior' (quanto mais, melhor), 'menor' ou null (só informação)
function montarComparacao() {
  const area = document.getElementById('comparacao');
  const [c1, c2] = cenarios;
  if (!c1 || !c2) { area.hidden = true; area.innerHTML = ''; return; }

  const linhas = [
    { nome: 'Conta com a bandeira', v: function (c) { return c.conta; }, f: moeda, melhor: 'menor' },
    { nome: 'Consumo estimado', v: function (c) { return c.consumo; }, f: function (v) { return numero(v, 0) + ' kWh'; }, melhor: 'menor' },
    { nome: 'Opção recomendada', v: function (c) { return c.recomendada; }, f: String, melhor: null },
    { nome: 'Economia com assinatura', v: function (c) { return c.economiaA; }, f: function (v) { return v === null ? '–' : moeda(v) + '/mês'; }, melhor: 'maior' },
    { nome: 'Economia com placas', v: function (c) { return c.economiaB; }, f: function (v) { return moeda(v) + '/mês'; }, melhor: 'maior' },
    { nome: 'Placas necessárias', v: function (c) { return c.numPlacas; }, f: String, melhor: null },
    { nome: 'Investimento nas placas', v: function (c) { return c.investimento; }, f: moeda, melhor: 'menor' },
    { nome: 'Retorno do investimento', v: function (c) { return c.paybackB; }, f: function (v) { return isFinite(v) ? numero(v, 1) + ' anos' : '–'; }, melhor: 'menor' },
    { nome: 'Sol cobre do consumo', v: function (c) { return c.percentualSol; }, f: function (v) { return numero(v, 0) + '%'; }, melhor: 'maior' },
    { nome: 'Ganho em 5 anos (recomendada)', v: function (c) { return c.economia5anos; }, f: moeda, melhor: 'maior' }
  ];

  let html = '<table class="tabela-cenarios"><thead><tr><th></th><th><span class="vaga-numero">1</span> Cenário 1</th><th><span class="vaga-numero">2</span> Cenário 2</th><th>Diferença</th></tr></thead><tbody>';
  linhas.forEach(function (l) {
    const a = l.v(c1), b = l.v(c2);
    const numericos = typeof a === 'number' && typeof b === 'number' && isFinite(a) && isFinite(b);
    let classeA = '', classeB = '', diferenca = '<span class="igual">–</span>';
    if (numericos && l.melhor && Math.abs(a - b) > 0.004) {
      const ganhaB = l.melhor === 'maior' ? b > a : b < a;
      classeA = ganhaB ? '' : ' class="vence"';
      classeB = ganhaB ? ' class="vence"' : '';
      const delta = b - a;
      const texto = (delta > 0 ? '+' : '−') + l.f(Math.abs(delta)).replace('/mês', '');
      diferenca = '<span class="delta ' + (ganhaB ? 'bom' : 'ruim') + '">' + texto + '</span>';
    } else if (!numericos && a !== b && a !== null && b !== null) {
      diferenca = '<span class="igual">mudou</span>';
    }
    // data-rotulo aparece só no celular, quando a tabela vira "cartõezinhos"
    html += '<tr><th scope="row">' + l.nome + '</th><td data-rotulo="Cenário 1"' + classeA + '>' + l.f(a) + '</td><td data-rotulo="Cenário 2"' + classeB + '>' + l.f(b) + '</td><td class="col-diferenca">' + diferenca + '</td></tr>';
  });
  html += '</tbody></table><p class="dica legenda-tabela"><span class="vence-exemplo"></span> melhor valor da linha · Diferença = cenário 2 menos cenário 1</p>';
  area.innerHTML = html;
  area.hidden = false;
}

montarCenarios();

// ---------- Botão "Calcular" ----------
formulario.addEventListener('submit', function (evento) {
  evento.preventDefault(); // não recarrega a página

  if (!validarFormulario()) return;

  const valorConta = Number(campoConta.value);
  const tipoLigacao = campoLigacao.value;
  const imovel = document.querySelector('input[name="imovel"]:checked').value;

  // A "cozinha": todas as contas acontecem em calculo.js
  const areaTelhado = Number(campoArea.value) || 0; // vazio = não informado
  const resultado = simular(valorConta, tipoLigacao, imovel, areaTelhado);

  montarDestaque(resultado);
  montarCardA(resultado.opcaoA);
  montarCardB(resultado.opcaoB);
  marcarRecomendada(resultado.recomendacao);

  document.getElementById('consumo').textContent = numero(resultado.consumo, 0) + ' kWh';
  document.getElementById('motivo').textContent = resultado.motivo || '';

  // Aviso quando o imóvel é alugado e nenhuma empresa aceita a conta
  const aviso = document.getElementById('aviso-geral');
  if (resultado.recomendacao === null) {
    aviso.textContent = 'Nenhuma opção disponível: imóvel alugado não permite instalar placas e sua conta está abaixo da fatura mínima das empresas de assinatura.';
    aviso.hidden = false;
  } else {
    aviso.hidden = true;
  }

  secaoResultados.hidden = false;
  secaoResultados.classList.remove('animar');
  void secaoResultados.offsetWidth; // truque para o navegador reiniciar a animação
  secaoResultados.classList.add('animar');
  desenharGrafico(resultado);
  montarCobertura(resultado);
  montarDiaDeSol(resultado);

  // guarda a simulação para a calculadora de tarifa e os cenários
  resultadoAtual = resultado;
  entradaAtual = { valorConta: valorConta, tipoLigacao: tipoLigacao, imovel: imovel, areaTelhado: areaTelhado };
  atualizarBandeira();
  secaoResultados.scrollIntoView({ behavior: 'smooth' });
});

// ---------- Vitrine ----------
// Escolhe o ícone do produto pelo nome (usado se a foto não carregar)
function iconeDoItem(nome) {
  if (/kit/i.test(nome)) return icone('caixa');
  if (/inversor/i.test(nome)) return icone('inversor');
  return icone('painel');
}

// Fotos reais (livres, Wikimedia Commons). Créditos no fim da vitrine.
function fotoDoItem(nome) {
  if (/kit/i.test(nome)) return 'img/kit-solar.jpg';
  if (/inversor/i.test(nome)) return 'img/inversor.jpg';
  return 'img/placa-solar.jpg';
}

function montarVitrine(categoria) {
  const lista = document.getElementById('lista-vitrine');
  const itens = VITRINE.filter(function (item) {
    return categoria === 'todos' || item.categoria === categoria;
  });

  lista.innerHTML = itens.map(function (item) {
    const potencia = item.potencia ? '<span class="dica">' + icone('raio') + ' ' + item.potencia + '</span>' : '';
    // Se a foto falhar, a classe "sem-foto" esconde a imagem e mostra o ícone
    return '<article class="card item-vitrine">' +
             '<div class="foto">' +
               '<img src="' + fotoDoItem(item.nome) + '" alt="Foto ilustrativa: ' + item.nome + '" loading="lazy" ' +
                    'onerror="this.parentNode.classList.add(\'sem-foto\')">' +
               '<span class="categoria ' + item.categoria + '">' + item.categoria + '</span>' +
               iconeDoItem(item.nome) +
             '</div>' +
             '<div class="info">' +
               '<h3>' + item.nome + '</h3>' + potencia +
               '<span class="preco">' + moeda(item.preco) + '</span>' +
               '<span class="dica loja">' + icone('loja') + ' ' + item.loja + '</span>' +
             '</div>' +
           '</article>';
  }).join('');
}

// Botões de filtro da vitrine
document.getElementById('filtros').addEventListener('click', function (evento) {
  const botao = evento.target.closest('.filtro');
  if (!botao) return;
  document.querySelectorAll('.filtro').forEach(function (b) { b.classList.remove('ativo'); });
  botao.classList.add('ativo');
  montarVitrine(botao.dataset.categoria);
});

// Mostra a vitrine assim que a página abre
montarVitrine('todos');

// ---------- Cabeçalho ganha sombra quando a página rola ----------
const topo = document.querySelector('.topo');
window.addEventListener('scroll', function () {
  topo.classList.toggle('rolou', window.scrollY > 8);
}, { passive: true });
