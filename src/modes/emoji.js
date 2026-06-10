import { emojiPuzzles } from "../data/emoji.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const emojiMode = {
  key: "emoji",
  title: "Emoji + Sentence",
  pool: emojiPuzzles,
  render(item) {
    return {
      promptHtml: "What is this in English?",
      emojiHtml: "<span class='emoji'>" + item.emoji + "</span>",
      answer: item.answer,
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Create an English sentence using <strong>" + item.answer + "</strong>!",
        answer: 'Any correct English sentence using "' + item.answer + '"',
      },
    };
  },
};
