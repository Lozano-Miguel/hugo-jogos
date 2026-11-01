# Hugo – Comboio

O jogo do comboio do Hugo, tal como passava na RTP e no CD "Hugo: Apita o Comboio" (1998), a correr no browser.

> **Aviso:** projeto de fãs, não oficial e sem fins comerciais. Não tem qualquer ligação à Hugo Games A/S.
> O Hugo e todas as personagens pertencem aos respetivos donos. Se fores detentor dos direitos e quiseres que o
> projeto seja retirado, contacta-nos e será retirado de imediato.
>
> *Unofficial, non-commercial fan project, not affiliated with Hugo Games A/S. Hugo and all related characters and
> trademarks belong to their respective owners.*

## Como correr

O código não inclui os ficheiros do jogo original. Precisas do `data.big` do CD português de 1998
("Hugo: Apita o Comboio").

```bash
npm install
npm run extract -- caminho/para/data.big   # por omissão: original/cd-1998-files/data.big
npm run dev
```

`npm run extract` copia os ficheiros originais para `public/data/` (ignorado pelo git). `npm test` corre os testes.

Controlos: **4** esquerda, **6** direita, **5** / Enter para começar (as setas também funcionam). **Espaço** salta a fala do Hugo, **Esc** volta ao menu. Joga-se com o teclado.

No modo **TV** a linha é sempre a mesma (a do programa da RTP); no modo **Arcade** é gerada ao acaso, como no CD original.

## Regras do projeto

- Sem dinheiro: sem anúncios, donativos, patrocínios ou versão paga.
- Os ficheiros originais ficam fora do código.
- Se chegar um pedido de remoção, é cumprido de imediato.

## Créditos

- Hugo © ITE / Hugo Games A/S. Vozes portuguesas: Frederico Trancoso (Hugo), Graça Ferreira (Hugolina), Mónica Garcez (Maldiva).
- Formatos de ficheiros (CGF, TIL, OOS) documentados por [gzalo/hugo-re](https://github.com/gzalo/hugo-re) (licença MIT).
