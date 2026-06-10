import { rhymeChallenges } from "../data/rhyme.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const rhymeMode = {
  key: "rhyme",
  title: "Rhyme Time",
  pool: rhymeChallenges,
  render(item) {
    return {
      promptHtml:
        "<strong>Name 3 words that rhyme with:</strong><br><span style='font-size:2em;font-weight:800;color:var(--accent-yellow)'>" + item.word + "</span>",
      answer: "Exemplos: " + item.rhymes.slice(0, 5).join(", "),
      panelClass: "challenge-bonus",
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Use the word <strong>" + item.word + "</strong> in an English sentence!",
        answer: 'Any correct English sentence using "' + item.word + '"',
      },
    };
  },
};
