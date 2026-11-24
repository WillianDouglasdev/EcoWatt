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
  opcaoA.empresas.forEach(function (empresa) {
    const classe = empresa.elegivel ? 'empresa' : 'empresa inelegivel';
    const etiqueta = empresa.elegivel
      ? '<span class="etiqueta">Elegível</span>'
      : '<span class="etiqueta nao">Conta mínima ' + moeda(empresa.faturaMinima) + '</span>';
    const economia = empresa.elegivel
      ? moeda(empresa.economiaMensal) + '/mês (' + numero(empresa.desconto * 100, 0) + '% de desconto)'
      : 'Não disponível para o seu valor de conta';
    const link = empresa.site ? ' · <a href="' + empresa.site + '" target="_blank" rel="noopener">site</a>' : '';
    html += '<div class="' + classe + '"><span class="nome">' + empresa.nome + '</span>' + etiqueta +
            '<br><span class="dica">' + economia + link + '</span></div>';
  });

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
      borderColor: '#F9A825', backgroundColor: '#F9A825', borderWidth: 3, tension: 0.2 });
  }
  conjuntos.push({ label: 'B – Placas no telhado', data: linhaB,
    borderColor: '#2E7D32', backgroundColor: '#2E7D32', borderWidth: 3, tension: 0.2 });

  if (graficoAtual) graficoAtual.destroy(); // apaga o gráfico anterior

  graficoAtual = new Chart(canvas, {
    type: 'line',
    data: { labels: rotulos, datasets: conjuntos },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: { label: function (item) { return item.dataset.label + ': ' + moeda(item.parsed.y); } } }
      },
      scales: {
        y: { ticks: { callback: function (v) { return moeda(v); } } }
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
    aviso.textContent = '⚠️ Nenhuma opção disponível: imóvel alugado não permite instalar placas e sua conta está abaixo da fatura mínima das empresas de assinatura.';
    aviso.hidden = false;
  } else {
    aviso.hidden = true;
  }

  secaoResultados.hidden = false;
  desenharGrafico(resultado);
  secaoResultados.scrollIntoView({ behavior: 'smooth' });
});

// ---------- Vitrine ----------
function montarVitrine(categoria) {
  const lista = document.getElementById('lista-vitrine');
  const itens = VITRINE.filter(function (item) {
    return categoria === 'todos' || item.categoria === categoria;
  });

  lista.innerHTML = itens.map(function (item) {
    const potencia = item.potencia ? '<span class="dica">⚡ ' + item.potencia + '</span>' : '';
    return '<article class="card item-vitrine">' +
             '<span class="categoria ' + item.categoria + '">' + item.categoria + '</span>' +
             '<h3>' + item.nome + '</h3>' + potencia +
             '<span class="preco">' + moeda(item.preco) + '</span>' +
             '<span class="dica">🏪 ' + item.loja + '</span>' +
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
