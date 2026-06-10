import { name3Challenges } from "../data/name3.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const name3Mode = {
  key: "name3",
  title: "Name 3 Things",
  pool: name3Challenges,
  answerLabel: "examples",
  render(item) {
    const text = item && item.text ? item.text : "";
    const word = (item.examples || "").split(",")[0].trim();
    return {
      promptHtml: "<strong>" + text + "</strong><br><small>In English only!</small>",
      answer: item.examples || "Three valid examples in English.",
      bonus: word
        ? {
            html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Use <strong>" + word + "</strong> in an English sentence!",
            answer: 'Any correct English sentence using the word "' + word + '"',
          }
        : null,
    };
  },
};
