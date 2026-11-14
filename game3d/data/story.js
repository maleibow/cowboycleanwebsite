// Cutscene script, copied verbatim from the original (cleaningup.html 1707-1817). `s` = speaker, `t` = line.
// Triggers (same as the original): `intro` before stage 1, `stageN` before each later stage on loop 1, `ending` after stage 10.
export const Story = {
  intro: [
    { s: 'Grime Overlord', t: "MWAHAHA! This world is far too clean! I'm taking over, and taking Miss Cowboy with me!" },
    { s: 'Miss Cowboy', t: "Help me, Cowboy Clean! He's too filthy! Ahhhh!" },
    { s: 'Cowboy Clean', t: "Hold on, little lady! I'll scrub this planet top to bottom to find you!" },
  ],
  stage2: [
    { s: 'Cowboy Clean', t: 'The desert is dusted. But this jungle is oozing with sludge!' },
    { s: 'Grime Overlord', t: "You're too late, soap-slinger! The muck is already spreading!" },
  ],
  stage3: [
    { s: 'Cowboy Clean', t: 'A city made of trash... Disgusting. Time to shine up this scrap.' },
  ],
  stage4: [
    { s: 'Miss Cowboy', t: '*static*... Cowboy... the big city is covered in grime! Hurry!' },
    { s: 'Cowboy Clean', t: "I'm on my way! Just gotta wipe down these dirty streets." },
  ],
  stage5: [
    { s: 'Cowboy Clean', t: "Paris... the city of lights. More like the city of blights right now. Let's sanitize." },
  ],
  stage6: [
    { s: 'Grime Overlord', t: "You persist, but you'll never survive the Grime Volcano!" },
    { s: 'Cowboy Clean', t: "I'm bringing the bleach, Overlord. It ends here!" },
  ],
  stage7: [
    { s: 'Cowboy Clean', t: 'Woah... Rainbow Island. Looks pretty, but the mud is real.' },
    { s: 'Grime Overlord', t: "Don't let the colors fool you! The filth hides everywhere!" },
  ],
  stage8: [
    { s: 'Cowboy Clean', t: "Up in the clouds now. I'm coming for you, Overlord!" },
    { s: 'Grime Overlord', t: 'The Cloud Dream will be your nightmare!' },
  ],
  stage9: [
    { s: 'Miss Cowboy', t: "Cowboy! He's brought me to the Haunted Village! I'm scared!" },
    { s: 'Cowboy Clean', t: "Don't worry, ma'am! I ain't afraid of no ghosts!" },
  ],
  stage10: [
    { s: 'Cowboy Clean', t: "The water's ruby... flowing through the streets." },
    { s: 'Ghost', t: 'You have found me in the darkness...you will succumb to my will' },
    { s: 'Cowboy Clean', t: 'your evil will not prevail. The world will see light again' },
    { s: 'Ghost', t: 'I am all darkness. I am unknown. I am your ghost' },
  ],
  ending: [
    { s: 'Grime Overlord', t: 'NOOO! My beautiful filth! Washed away completely!' },
    { s: 'Miss Cowboy', t: 'My hero! You made the world sparkle again!' },
    { s: 'Cowboy Clean', t: "A cowboy's work is never truly done... but for now, we shine." },
  ],
};
// Which script plays before a stage: the intro before stage 1 (and any cheat start on stage 1), `stageN` otherwise.
export const storyIdFor = (stage) => (stage === 1 ? 'intro' : 'stage' + stage);
