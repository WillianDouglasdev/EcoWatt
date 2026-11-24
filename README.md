# Sol na Conta – Simulador de Energia Solar

> Descubra quanto o sol pode tirar da sua conta de luz.

MVP do projeto **UPX 3** (Cidades Inteligentes · ODS 7, 9 e 11).
A pessoa digita o **valor da conta de luz** (não precisa saber o consumo em kWh) e o site compara dois caminhos:

| | Opção A – Assinatura solar | Opção B – Placas no telhado |
|---|---|---|
| Obra | Nenhuma | Instalação |
| Serve para imóvel alugado | Sim | Não |
| O que calculamos | Empresas elegíveis e desconto | Nº de placas, kWp, investimento, payback |

Um **motor de regras** recomenda a melhor opção (imóvel alugado, fatura mínima e ganho em 5 anos), mas as duas aparecem sempre.

## O que o site mostra

- **Economia em R$** em destaque, por mês e em 12 meses.
- **Gráfico de ganho acumulado** em 5 anos (A x B).
- **Quanto do consumo o sol cobre** e quanto continua vindo da rede (o mínimo de disponibilidade da Cemig).
- **Área do telhado (opcional):** confere se as placas cabem e recalcula a economia se não couberem.
- **Um dia de sol:** geração x consumo hora a hora, com a **sobra de dia**, a **falta à noite** e o tamanho de uma **bateria** para guardar a sobra (estimativa educativa).
- **Calculadora de tarifa:** escolha a bandeira (verde, amarela, vermelha 1 ou 2, valores da ANEEL) e veja a conta, a economia de cada opção e o retorno mudarem.
- **Comparar cenários:** guarde duas simulações e veja lado a lado, com o melhor valor de cada linha em destaque e a diferença entre elas.
- **Energia inteligente:** gerar, acompanhar e guardar, dicas de horário de uso e os ODS 7, 9 e 11.
- **Vitrine** de equipamentos novos, usados e recondicionados (preços ilustrativos).

## Como abrir

1. Baixe ou clone o repositório.
2. Dê dois cliques em `index.html`. Pronto: não precisa instalar nada.

Versão publicada (GitHub Pages): https://williandouglasdev.github.io/EcoWatt/

## Estrutura

```text
index.html      página única: início, simulador, resultados, energia inteligente e vitrine
css/style.css   identidade visual e responsividade
js/dados.js     parâmetros, faixa de CEP, empresas, bandeiras tarifárias, perfil de consumo por hora e vitrine
js/calculo.js   funções puras de cálculo e motor de regras (não mexe na tela)
js/app.js       lê o formulário, valida, chama os cálculos e mostra os resultados
img/            fotos da vitrine (Wikimedia Commons, créditos no site)
```

Tecnologias: HTML5, CSS3 e JavaScript puro. Única dependência externa: Chart.js via CDN.

## Conferência dos cálculos

| Entrada | Perfil 1 | Perfil 2 | Perfil 3 |
|---|---|---|---|
| Conta / ligação | R$ 150 / mono | R$ 300 / bi | R$ 600 / tri |
| Nº de placas | 2 | 4 | 7 |
| Investimento | R$ 2.695,00 | R$ 5.390,00 | R$ 9.432,50 |
| Economia mensal (B) | R$ 103,14 | R$ 216,90 | R$ 433,80 |
| Sol cobre do consumo | 76% | 80% | 80% |

Valores estimados para fins acadêmicos. Não substituem um projeto feito por um profissional.
