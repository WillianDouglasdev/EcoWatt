/* =========================================================
   EcoWatt – app.js
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
const secaoResultados = document.getElementById('resultados');

let graficoAtual = null; // guarda o gráfico para poder apagar antes de desenhar outro

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
    mostrarErro(campoCep, 'Por enquanto o EcoWatt atende só Minas Gerais (CEP 30000-000 a 39999-999).');
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

// ---------- Botão "Calcular" ----------
formulario.addEventListener('submit', function (evento) {
  evento.preventDefault(); // não recarrega a página

  if (!validarFormulario()) return;

  const valorConta = Number(campoConta.value);
  const tipoLigacao = campoLigacao.value;
  const imovel = document.querySelector('input[name="imovel"]:checked').value;

  // A "cozinha": todas as contas acontecem em calculo.js
  const resultado = simular(valorConta, tipoLigacao, imovel);

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
  secaoResultados.scrollIntoView({ behavior: 'smooth' });
});

// ---------- Vitrine ----------
// Escolhe o ícone da "foto" do produto pelo nome (só visual)
function iconeDoItem(nome) {
  if (/kit/i.test(nome)) return icone('caixa');
  if (/inversor/i.test(nome)) return icone('inversor');
  return icone('painel');
}

function montarVitrine(categoria) {
  const lista = document.getElementById('lista-vitrine');
  const itens = VITRINE.filter(function (item) {
    return categoria === 'todos' || item.categoria === categoria;
  });

  lista.innerHTML = itens.map(function (item) {
    const potencia = item.potencia ? '<span class="dica">' + icone('raio') + ' ' + item.potencia + '</span>' : '';
    return '<article class="card item-vitrine">' +
             '<div class="foto">' +
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
