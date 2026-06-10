import { sentenceChallenges } from "../data/sentence.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const sentenceMode = {
  key: "sentence",
  title: "Complete the Sentence",
  pool: sentenceChallenges,
  render(item) {
    return {
      promptHtml: "<strong>" + item.sentence + "</strong>",
      answer: item.answer,
      options: item.options,
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Now say the full sentence in English!",
        answer: "The full correct sentence with: " + item.answer,
      },
    };
  },
};
