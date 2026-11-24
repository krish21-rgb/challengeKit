import { Check, Sparkles, Zap } from "lucide-react";

/** A deliberately non-interactive illustration, not a functioning quiz. */
export function QuizPreview() {
  return (
    <div className="preview-wrap" aria-label="Illustration of a future challengeKit quiz">
      <div className="preview-swoop" aria-hidden="true" />
      <div className="preview-star star-one" aria-hidden="true">✳</div>
      <div className="preview-star star-two" aria-hidden="true">✦</div>
      <div className="floating-label float-top"><Sparkles size={15} fill="currentColor" /> A little bit of magic</div>
      <div className="quiz-card">
        <div className="quiz-top">
          <span className="quiz-badge"><span /> QUICK CHALLENGE</span>
          <span className="quiz-count">01 <span>/ 04</span></span>
        </div>
        <div className="quiz-progress"><span /></div>
        <div className="quiz-topic">THE NATURAL WORLD <span>✳</span></div>
        <h2>Which planet is known as the Red Planet?</h2>
        <div className="answers" aria-hidden="true">
          <div className="answer"><span className="answer-letter lavender">A</span> Venus</div>
          <div className="answer answer-correct"><span className="answer-letter green">B</span> Mars <Check size={17} strokeWidth={3} /></div>
          <div className="answer"><span className="answer-letter peach">C</span> Jupiter</div>
          <div className="answer"><span className="answer-letter blue">D</span> Neptune</div>
        </div>
        <div className="quiz-bottom"><span><span className="little-clock">◷</span> Think it through!</span><span>+ 100 pts <Zap size={14} fill="currentColor" /></span></div>
      </div>
      <div className="floating-label float-bottom"><span className="avatar-stack"><i>M</i><i>J</i><i>A</i></span><span><strong>Learning together</strong><small>is better together!</small></span><span className="float-heart">♥</span></div>
      <span className="preview-caption">A LITTLE PREVIEW OF WHAT’S TO COME</span>
    </div>
  );
}
