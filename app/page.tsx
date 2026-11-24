import { ArrowDown, ArrowRight, BookOpen, Check, CircleDot, Lightbulb, MousePointer2, Play, Sparkles, Trophy, Users, WandSparkles, Zap } from "lucide-react";
import { Brand } from "@/components/brand";
import { QuizPreview } from "@/components/quiz-preview";

const features = [
  { icon: BookOpen, number: "01", title: "Make it yours", description: "Turn the things you’re teaching into bite-sized challenges that bring every lesson to life.", tone: "lilac" },
  { icon: Users, number: "02", title: "Play together", description: "Bring everyone into the moment. A little friendly competition makes room for a lot of learning.", tone: "peach" },
  { icon: Trophy, number: "03", title: "Celebrate progress", description: "Make every ‘aha!’ moment count and give learners something to feel good about.", tone: "lime" },
];

const steps = [
  { number: "01", title: "Create a challenge", text: "Build a quiz around whatever you’re teaching, exploring, or curious about." },
  { number: "02", title: "Bring everyone in", text: "Share a game PIN so learners can join in from their own devices." },
  { number: "03", title: "Let the learning begin", text: "Play, discover, and celebrate the little wins together." },
];

export default function Home() {
  return (
    <main id="top">
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#why">Why challengeKit</a>
            <a href="#how">How it works</a>
            <a href="#about">Our mission</a>
          </nav>
          <div className="header-account"><a className="header-signin" href="/login">Sign in</a><a className="header-cta" href="/register">Get started <ArrowRight size={16} /></a></div>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> A FRESH WAY TO LEARN <span className="eyebrow-spark">✳</span></div>
            <h1 id="hero-title">Big curiosity.<br />Little <span>challenges<span className="title-dot">.</span><svg viewBox="0 0 290 15" preserveAspectRatio="none" aria-hidden="true"><path d="M3 11C76 2 196 1 286 8" /></svg></span></h1>
            <p className="hero-description">Make room for more <em>aha!</em> moments. challengeKit turns everyday learning into something everyone wants to be part of.</p>
            <div className="hero-actions">
              <a className="button button-dark" href="#how">Explore challengeKit <ArrowRight size={18} /></a>
              <a className="text-link" href="#why"><span className="play-icon"><Play size={12} fill="currentColor" /></span> What’s the idea?</a>
            </div>
            <div className="hero-note"><span className="mini-spark">✳</span> Made for curious minds &amp; the people who teach them</div>
          </div>
          <QuizPreview />
        </div>
        <div className="container hero-bottom"><span>GOOD THINGS HAPPEN WHEN WE LEARN TOGETHER</span><a href="#why" aria-label="Scroll to learn more"><ArrowDown size={17} /></a></div>
      </section>

      <section className="benefits-strip" aria-label="Our approach">
        <div className="container strip-inner"><span><Sparkles size={17} /> MORE CURIOSITY</span><i>✳</i><span><Zap size={17} /> MORE CONNECTION</span><i>✳</i><span><Lightbulb size={17} /> MORE “I GET IT!”</span><i>✳</i><span><Trophy size={17} /> MORE LITTLE WINS</span></div>
      </section>

      <section className="section features-section" id="why">
        <div className="container">
          <div className="section-heading feature-heading"><div><span className="section-kicker"><span /> THE CHALLENGEKIT WAY</span><h2>Learning should feel<br /><span>like an adventure.</span></h2></div><p>Because when curiosity leads the way, wonderful things happen. Here’s what we’re dreaming up for your classroom.</p></div>
          <div className="feature-grid">{features.map(({ icon: Icon, number, title, description, tone }) => <article className={`feature-card ${tone}`} key={number}><div className="feature-card-top"><span className="feature-icon"><Icon size={25} strokeWidth={1.8} /></span><span className="feature-number">{number} / 03</span></div><h3>{title}</h3><p>{description}</p><span className="feature-arrow" aria-hidden="true"><ArrowRight size={19} /></span></article>)}</div>
          <p className="feature-footnote"><span>✳</span> Built with teachers in mind. Made for every kind of learner.</p>
        </div>
      </section>

      <section className="section how-section" id="how">
        <div className="container how-grid">
          <div className="how-intro"><span className="section-kicker"><span /> SIMPLE BY DESIGN</span><h2>A little challenge.<br /><span>A lot of possibility.</span></h2><p>From the first question to the final high five, we’re making it easier to learn better, together.</p><div className="how-doodle" aria-hidden="true"><span>✳</span><svg viewBox="0 0 130 68"><path d="M2 62C34 9 78 9 121 34M108 20l14 14-19 4" /></svg><small>YOU’VE GOT THIS!</small></div></div>
          <div className="steps">{steps.map((step, index) => <article className="step" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><span className={`step-icon step-icon-${index}`} aria-hidden="true">{index === 0 ? <WandSparkles size={21} /> : index === 1 ? <MousePointer2 size={21} /> : <Check size={22} />}</span></article>)}</div>
        </div>
      </section>

      <section className="cta-section" id="about"><div className="container"><div className="cta-card"><span className="cta-spark cta-spark-one" aria-hidden="true">✳</span><span className="cta-spark cta-spark-two" aria-hidden="true">✦</span><span className="cta-kicker"><CircleDot size={14} /> HERE’S TO THE CURIOUS ONES</span><h2>Let’s make learning<br /><em>something to look forward to.</em></h2><p>For the big questions, the little wins, and everything in between. We’re just getting started.</p><a className="button button-lime" href="#top">Back to the top <ArrowRight size={18} /></a><span className="cta-bottom">A LITTLE CURIOSITY GOES A LONG WAY <span>↗</span></span></div></div></section>

      <footer className="footer"><div className="container"><div className="footer-main"><div><Brand /><p>Learning is better when it’s a challenge.<br />Made for curious minds, everywhere.</p></div><div className="footer-links"><div><span>EXPLORE</span><a href="#why">Why challengeKit</a><a href="#how">How it works</a><a href="#about">Our mission</a></div><div><span>MADE FOR</span><p>Teachers</p><p>Students</p><p>Curious minds</p></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} challengeKit. Made with curiosity.</span><span>LEARN A LITTLE. GROW A LOT. <span>✳</span></span></div></div></footer>
    </main>
  );
}
