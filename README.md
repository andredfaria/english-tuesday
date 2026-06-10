# 🇬🇧 English Tuesday — Team Battle!

> An open-source, projector-ready classroom game that turns English practice into a friendly **Blue Team vs Red Team** competition.

**English Tuesday** was built for a study group of Portuguese speakers learning English. Every Tuesday the group gets together, splits into two teams, and a host (teacher/facilitator) runs quick spoken challenges on a big screen. It keeps practice **fast, social, and low-pressure** — the focus is on *speaking out loud* and having fun, not on grammar drills.

It's a single self-contained HTML file. No installation, no accounts, no internet required — just open it and play.

## ▶️ Play / Run it

**Option 1 — Open locally**
Download or clone the repo and open `index.html` in any modern browser (double-click works).

**Option 2 — Host it for free on GitHub Pages**
1. Push this repo to GitHub.
2. Go to **Settings → Pages**, set the source to your `main` branch (root folder).
3. Your game goes live at `https://<your-username>.github.io/<repo-name>/` — share the link with the group.

> 💡 No build step, no dependencies. The whole app is one file.

## 🎮 How it works

Two teams compete. The host runs rounds, and players answer **in English**. The app tracks scores, whose turn it is, and a timer — so the host can focus on the group.

### Game modes (7)

| Mode | Challenge |
|------|-----------|
| 🧠 **Name 3 Things** | Name three things in a category (3 colors, 3 animals…) |
| 🖼️ **Emoji + Sentence** | Guess the word from an emoji, then use it in a sentence |
| ✍️ **Complete the Sentence** | Pick the right word to finish a sentence (multiple choice) |
| 🔁 **Translation + Negative** | Translate a phrase, then say its negative form |
| ❓ **Odd One Out** | Spot the word that doesn't belong, and explain why |
| 🎵 **Rhyme Time** | Name words that rhyme with a given word |
| 🗣️ **Describe It!** | Describe a word in English *without* saying it |

Pick a specific mode, or let the app choose **Random** each round.

### Built-in mechanics

- **⏱️ Timer ring** — each round is timed; difficulty changes the seconds and points.
- **📊 Difficulty levels** — Easy / Medium / Hard, with more points for harder challenges.
- **➕ Bonus tasks** — most rounds offer an optional extra (+3 pts) to push speaking practice.
- **🎲 Double or Nothing** — get 3 correct in a row and your team can bet the round for double points… or lose them.
- **👥 Player rotation** — add players to each team and the app rotates who answers, so everyone participates.
- **🔀 No repeats** — challenges don't repeat until the deck runs out, then it reshuffles.
- **🎉 Sound & confetti** — celebratory feedback (both toggleable in Settings).

## ⚙️ Settings

Click the gear icon (top-right) to:
- Rename the teams and add/remove players on each side
- Set the round timer duration
- Toggle sound effects and confetti
- Reshuffle the challenge deck

## 🤝 Contributing

This is open source — contributions from the study group (and anyone else!) are welcome. The easiest and most valuable way to help is **adding more challenges**.

All challenges live as plain arrays at the bottom of `index.html` (`name3Challenges`, `emojiPuzzles`, `sentenceChallenges`, etc.). To add one, copy an existing entry in the relevant array and edit the text — match the same fields. For example:

```js
// Name 3 Things
{text:"Name 3 musical instruments", examples:"guitar, piano, drums", difficulty:"easy"},

// Emoji + Sentence
{emoji:"🌧️", answer:"rain", difficulty:"easy"},
```

See [`CLAUDE.md`](CLAUDE.md) for a full map of the code, the data shapes for each mode, and how to add an entirely new game mode.

**To contribute:** fork the repo → add your challenges → open a Pull Request.

## 📝 Notes

- All state (scores, players, settings) lives in memory and **resets when the page reloads** — perfect for a fresh session each meeting.
- Designed for a full-screen 16:9 display (projector or shared screen). Dark theme by default.

## 📄 License

Released under the MIT License — free to use, share, and adapt for your own study group.

---

### 🇧🇷 Sobre o projeto (resumo em português)

**English Tuesday** é um jogo de código aberto criado por um grupo de estudo de inglês para tornar a prática do idioma mais divertida. Dois times (Azul e Vermelho) competem em desafios rápidos de fala, com placar, cronômetro e 7 modos de jogo diferentes. É um único arquivo HTML — basta abrir no navegador, sem instalação. Contribuições são bem-vindas, principalmente adicionando novos desafios (veja a seção *Contributing* acima).
