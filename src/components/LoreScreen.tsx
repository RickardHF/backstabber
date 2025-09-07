"use client";

import React, { useEffect, useRef, useState } from 'react';

interface LoreScreenProps {
  onStartGame: () => void;
  onBackToMenu: () => void;
}

const LORE = `You, Cedric Bearsbane, has been on a quest to rescue the young, fair maiden Gunnhild Rustyhair from the grips of earl Godfrid Shieldbiter. 
Godfrid is a feared and respected earl who is rich in soil, powerfull friends, and controls hunting grounds in the forests to the north, providing him much pelts to trade. Godfrid was said to have a good standing with the Gods. He often had blots in their honor and he was a powerful magician.

Almost two weeks ago Godfrid visited the farm of Gunnhilds family to collect the tax. Uppon seeing Gunnhild he demanded her to be wed to him. She laughed it of and her father politely refused to proposal, afterall she was promised to you. 
Godfrid rode away in anger. 

Late in the night did Godfrid return with his closest huskarls. All were equiped with weapons for war; spears, shields and swords. They did not wear any armour for they did not expect much resistance. 
Slowly they crept close to the farm, making sure not to alert anyone to their pressence. 

They walked passed the guard. It was Thorgrim who was on duty tonight, but he had fallen asleep in front of the fire. Godfrids huskarl Gustav gave him his deathblow before he could wake up.
They took the embers of the fire and ignited some dry hay they found close by. With this they set fire to the farm house and waited at the door, ready to strike any who escaped through it. 

As the inhabitants woke from the fire, panic soon broke out. Some fled to the door, but were stabbed with spears right away. When Ask Seersson, Gunnhilds father, saw this he cried out to ask who was there, and what did they want. 

Godfrid said it was he, and that he wanted his daughter to marry. If he was given her all would be free to go. Seeing the situation Ask quickly agreed and sent Gunnhild out. 

As soon as she was out Gustav snatched her, to keep her for Godfrid. 
Godfrid did not intend on keeping the deal, instead he let the door be baricaded, and had his men throw buring wood and hay through any opening they found in the house. It didn't take long before the house had burned all the way to the ground, sparing no one.

As soon as you heard the news you wanted to take up arms and fare straight to Godfrid to demand he let Gunnhild free. Others adviced against it, saying it was a fools quest. Godfrid was friends with all the most powerful men in the realm, and he had the Gods on his side too.

For some time you adhered these words, but as time went by the wounds didn't heal. Every night you woke, dripping sweat, your heart beating. And whats worse is that you feel all are talking behind your back. Not only have you lost your wife to be, your honor too!

You decide finally to go to Godfrid and rescue Gunnhild. The power is much to big to face straight on, so you will have to use your wits. 

To disguise the plan, you bring only a few trusted huskarls. To the farmspeople you say you are going to take a look at the pastures in the hills.
Godfrid had however seen through this plan. He had expected some form of retaliation, and had been waiting for you to leave the farm so he could take you out with magic.

You rode out towards the pastures, it was on the same path as the path to Godfrid. And uppon reaching the hills you made a camp for the night. Some time did you spend planning and thinking about the next step before slowly drifting asleep. At the same time Godfrid had decided to use magic on you. 
Only the strongest magic would work, for he intended to kill you. 

He had spent the entire day carving the runes for his spells and laying them out. The magic itself would not suffice, he would also need the help of the Gods. The Gods, although Godfrid was on good standing with them, always requrie a sacrifice.
For them to take another life, they require blood! Godfrid knew sacrificing a slave would not work. A slave isn't of the same value as a high born. So he lured Gustav with him to the place he had prepared the runes, thinking that with such a sacrifice he'd surely succeed. 

Gustav walked straight in the trap, not expecting such a betrayal, so loved and important he had been for Godfrid. As soon as they reached the place Godfrid ran up behind him and struck him in the head with an axe, before slitting his throat to let the blood flow over the carved runes as is the custom. 

The Gods were delighted with the sacrifice. "Godfrid always bring us such great gifts!" said one. "Surely a great gift! Let's make his wish come true!" said another. "Wait!" said a thrid, "let us not give him his will that easily. So long have we waited for such a sacrifice, and so long have we waited to kill a human. Let us savour this and make it interesting.". 

They discussed for a long time, but as time move differently in the world of humans and that of Gods the desicion was made as if in an instant. 

They let build a chamber with fortified walls, inescapeable. Then the thrid god let make guards. A wretched life-form, not quite alive but still moving, who had the sole purpose of taking the life of Cedric. They were imensly strong and could kill anyone they'd meet head on, but slow. 

This place was placed in a realm called Kinunda. It is a small place between the worlds of the living and the dead that most just pass by. 

Then they placed Cedric, you, in this chamber and sat back with glee waiting to be entertained. They let mead and meat be brought to them as they watched the events unfold.

Now you awake in this chamber. You don't know where you are or what is going on, but you got a feeling you are not in a friendly place. 

At your side you have only your gilded dagger with you. 
You now have only yourself to depend on and your wits to get out of this. 

How will you fare? Will you kill all the guards? Will you succumb to the challange? Is there an escape, or are you doomed no matter how valliantly you fight?

The Gods sit back and await the show to begin...
`;

const LoreScreen: React.FC<LoreScreenProps> = ({ onStartGame, onBackToMenu }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const startId = requestAnimationFrame(() => {
      el.classList.add('lore-scroll-start');
    });
    const handleEnd = () => setShowChoices(true);
    el.addEventListener('animationend', handleEnd);
    return () => { cancelAnimationFrame(startId); el.removeEventListener('animationend', handleEnd); };
  }, []);

  // Prepare paragraphs: treat double newlines as paragraph breaks, collapse single newlines inside paragraphs.
  const paragraphs = React.useMemo(() =>
    LORE.trim()
      .split(/\n\n+/)
      .map(p => p.replace(/\n+/g, ' ').trim())
  , []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-3xl mx-auto p-4">
      <div className="relative w-full panel p-6 md:p-10 overflow-hidden" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--background)] via-transparent to-[var(--background)]" />
        <div
          ref={containerRef}
          className="lore-scroll font-pixel text-sm md:text-base leading-relaxed tracking-wide text-[var(--muted)] overflow-hidden"
        >
          <div className="max-w-prose">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="mb-4 last:mb-0 text-left leading-[1.55] px-1 md:px-2"
              >
                {para}
              </p>
            ))}
          </div>
        </div>
        <div
          className={`flex flex-col items-center gap-4 transition-opacity duration-700 ${showChoices ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0 }}
        >
          <button className="btn-medieval btn-medieval--primary" onClick={onStartGame}>Enter Arena</button>
          <button className="btn-medieval" onClick={onBackToMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  );
};

export default LoreScreen;
