import type { Exercise, Ladder, LadderId, Phase, SessionId, Settings, Slot } from '../types';

const ph = (id: string) => [`exercises/${id}/0.jpg`, `exercises/${id}/1.jpg`];

export const EXERCISES: Exercise[] = [
  // ---------- Morning routine ----------
  {
    id: 'ktw', name: 'Banded knee-to-wall ankle mobilisation', metric: 'reps', equipment: 'band',
    dose: { sets: 2, reps: 10, note: 'right; left 1×10; 3 s hold' },
    howTo: 'Anchor a band low behind you and loop it around the front of your ankle. Stand in a short split stance facing a wall with the working foot forward. Drive the knee forward toward the wall over the 2nd–3rd toe, hold 3 s at the end, then ease back.',
    cues: ['Heel stays glued to the floor', 'Knee tracks over the 2nd–3rd toe', 'Let the band pull the ankle back as the knee goes forward'],
    mistake: 'Letting the heel lift or the knee cave inward to fake extra range.',
    why: 'Your right knee-to-wall is 6 cm behind your left; this closes the gap.',
    illustration: 'ktw',
  },
  {
    id: 'slant', name: 'Slant-board calf stretch', metric: 'hold', equipment: 'bodyweight',
    dose: { sets: 2, holdS: 45, note: 'knee straight, then bent; right side' },
    howTo: 'Stand on a slant board with the right heel low and toes high. Keep the knee straight and lean the hips forward until you feel the calf stretch, then hold. Repeat with the knee softly bent to move the stretch lower, into the soleus.',
    cues: ['Hips forward, body in one line', 'Arch stays up – don\'t let the foot roll in', 'Breathe slowly through the hold'],
    mistake: 'Bending at the waist instead of shifting the hips forward.',
    why: 'Calf tightness is one of the main limits on ankle bend.',
    illustration: 'slant',
  },
  {
    id: 'sf-1', name: 'Short foot – seated', metric: 'hold', equipment: 'bodyweight', ladder: 'shortfoot', level: 1,
    dose: { sets: 2, reps: 10, holdS: 5, perSide: true },
    howTo: 'Sit with the foot flat. Without curling the toes, pull the ball of the big toe back toward the heel so the arch lifts into a dome. Hold 5 s, relax fully, repeat.',
    cues: ['Toes stay long and relaxed', 'Big-toe ball stays on the floor', 'Think "shorten the foot", not "grip"'],
    mistake: 'Curling or clawing the toes – the arch rises but the wrong muscles do it.',
    why: 'Builds control of the small arch muscles that steady the foot.',
    illustration: 'shortfoot',
  },
  {
    id: 'sf-2', name: 'Short foot – standing', metric: 'hold', equipment: 'bodyweight', ladder: 'shortfoot', level: 2,
    dose: { sets: 2, reps: 10, holdS: 5, perSide: true },
    howTo: 'Same movement as seated, now standing with weight on both feet. Dome the arch by drawing the big-toe ball toward the heel, hold 5 s, relax.',
    cues: ['Toes stay long and relaxed', 'Knee stays soft and over the foot', 'Weight stays even across the foot'],
    mistake: 'Rolling onto the outside edge of the foot instead of doming the arch.',
    why: 'Builds control of the small arch muscles that steady the foot.',
    illustration: 'shortfoot',
  },
  {
    id: 'sf-3', name: 'Short foot – single-leg', metric: 'hold', equipment: 'bodyweight', ladder: 'shortfoot', level: 3,
    dose: { sets: 2, reps: 10, holdS: 5, perSide: true },
    howTo: 'Stand on one leg, fingertip on a counter if needed. Dome the arch without curling the toes and hold 5 s while staying balanced.',
    cues: ['Toes stay long and relaxed', 'Hips level', 'Light fingertip only'],
    mistake: 'Gripping the floor with the toes to keep balance.',
    why: 'Builds control of the small arch muscles that steady the foot.',
    illustration: 'shortfoot',
  },
  {
    id: 'toe-yoga', name: 'Toe yoga', metric: 'reps', equipment: 'bodyweight',
    dose: { sets: 2, reps: 10 },
    howTo: 'Sit or stand with the foot flat. Lift only the big toe while pressing the other four down, then switch: press the big toe down and lift the other four. One switch each way is one rep.',
    cues: ['Move slowly – control beats height', 'Keep the ankle still', 'Use a finger to help at first if needed'],
    mistake: 'Rolling the whole foot in or out to cheat the toes up.',
    why: 'Trains independent toe control for balance and push-off.',
    illustration: 'toeyoga',
  },
  {
    id: 'tib-1', name: 'Seated toe lifts', metric: 'reps', equipment: 'bodyweight', ladder: 'tibialis', level: 1,
    dose: { sets: 3, reps: 15, perSide: true, note: 'hold 2 s, lower over 3 s' },
    howTo: 'Sit with the heel on the floor. Lift the whole forefoot as one block toward the shin, hold 2 s, then lower over 3 s.',
    cues: ['Heel stays down', 'Lift the foot as one block', 'Toes relaxed, not clawed up'],
    mistake: 'Leading with the toes instead of lifting from the ankle.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib1',
  },
  {
    id: 'tib-2', name: 'Seated hold against hand', metric: 'hold', equipment: 'bodyweight', ladder: 'tibialis', level: 2,
    dose: { sets: 5, holdS: 10, note: '~70% effort' },
    howTo: 'Sit with the foot flat and press your hand down on top of the forefoot. Try to lift the foot into your hand at about 70% effort without letting it move. Hold 10 s.',
    cues: ['No movement – it\'s a hold', 'Steady effort, no jerking', 'Keep breathing'],
    mistake: 'Pushing at 100% and cramping instead of a steady 70%.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib2',
  },
  {
    id: 'tib-3', name: 'Seated banded toe lifts', metric: 'reps', equipment: 'band', ladder: 'tibialis', level: 3,
    dose: { sets: 3, reps: 12, repsMax: 15 },
    howTo: 'Sit with a band looped around the forefoot and anchored low in front of you. Keep the heel down and lift the forefoot against the band, then lower slowly.',
    cues: ['Heel stays down', 'Full range up and down', 'Slow lowering'],
    mistake: 'Sliding the heel back to make the band easier.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib3',
  },
  {
    id: 'tib-4', name: 'Standing lower-only tibialis', metric: 'reps', equipment: 'bodyweight', ladder: 'tibialis', level: 4,
    dose: { sets: 3, reps: 8, note: '4 s down' },
    howTo: 'Stand tall. Get the forefoot up any way you can (rock back, use the other foot), then lower it to the floor slowly over 4 s.',
    cues: ['The slow lowering is the exercise', 'Stay tall, don\'t sit back', 'Toes relaxed'],
    mistake: 'Dropping the foot in the last part of the range.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib4',
  },
  {
    id: 'tib-5', name: 'Wall tibialis raises – heels 10–15 cm out', metric: 'reps', equipment: 'bodyweight', ladder: 'tibialis', level: 5,
    dose: { sets: 3, reps: 15, note: 'heels 10–15 cm from wall' },
    howTo: 'Lean your back against a wall with your heels 10–15 cm out. Lift both forefeet toward your shins, then lower under control. Moving the heels about 5 cm further out makes it harder – that is the next level.',
    cues: ['Legs straight, back on the wall', 'Heels stay down', 'Full lift every rep'],
    mistake: 'Bending the knees to shorten the range.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib5',
  },
  {
    id: 'tib-6', name: 'Wall tibialis raises – heels 15–20 cm out', metric: 'reps', equipment: 'bodyweight', ladder: 'tibialis', level: 6,
    dose: { sets: 3, reps: 15, note: 'heels 15–20 cm from wall' },
    howTo: 'Lean your back against a wall with your heels 15–20 cm out. Lift both forefeet toward your shins, then lower under control. This is the 5 cm step out from level 5.',
    cues: ['Legs straight, back on the wall', 'Heels stay down', 'Full lift every rep'],
    mistake: 'Bending the knees to shorten the range.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib5',
  },
  {
    id: 'tib-7', name: 'Wall tibialis raises – heels 20–25 cm out', metric: 'reps', equipment: 'bodyweight', ladder: 'tibialis', level: 7,
    dose: { sets: 3, reps: 15, note: 'heels 20–25 cm from wall' },
    howTo: 'Lean your back against a wall with your heels 20–25 cm out. Lift both forefeet toward your shins, then lower under control. The last 5 cm step out.',
    cues: ['Legs straight, back on the wall', 'Heels stay down', 'Full lift every rep'],
    mistake: 'Bending the knees to shorten the range.',
    why: 'Strengthens the front of the shin, which lifts the foot and steadies the ankle.',
    illustration: 'tib5',
  },
  {
    id: 'clam', aliases: ['Clamshell', 'Banded clamshell'], name: 'Standing banded clamshell', metric: 'reps', equipment: 'band',
    dose: { sets: 1, reps: 15, perSide: true },
    howTo: 'Loop a mini-band just above the knees and stand in a quarter squat. Keeping the feet planted, rotate one knee outward against the band, then return slowly. Do all reps on one side, then switch.',
    cues: ['Feet stay planted', 'Pelvis stays square', 'Move from the hip, not the foot'],
    mistake: 'Rolling onto the outside of the foot instead of turning from the hip.',
    why: 'Wakes up the hip muscles that keep the knee from caving in.',
    illustration: 'clam',
  },

  // ---------- Evening routine ----------
  {
    id: 'bal-1', name: 'Single-leg balance – eyes open', metric: 'hold', equipment: 'bodyweight', ladder: 'balance', level: 1,
    dose: { sets: 3, holdS: 30, perSide: true },
    howTo: 'Stand on one leg near a counter, knee soft, and hold steady for 30 s. Swap legs.',
    cues: ['Stand tall, hips level', 'Knee soft, over the foot', 'Light toes – no gripping'],
    mistake: 'Locking the knee or letting the hip drop on the lifted side.',
    why: 'Rebuilds the ankle\'s balance reflexes after injury.',
    illustration: 'balance',
  },
  {
    id: 'bal-2', name: 'Single-leg balance – head turns', metric: 'hold', equipment: 'bodyweight', ladder: 'balance', level: 2,
    dose: { sets: 3, holdS: 30, perSide: true },
    howTo: 'Balance on one leg and slowly turn your head side to side the whole time. Swap legs.',
    cues: ['Slow, smooth head turns', 'Hips level', 'Knee soft'],
    mistake: 'Turning the whole body instead of just the head.',
    why: 'Rebuilds the ankle\'s balance reflexes after injury.',
    illustration: 'balance',
  },
  {
    id: 'bal-3', name: 'Single-leg balance – eyes closed, fingertip', metric: 'hold', equipment: 'bodyweight', ladder: 'balance', level: 3,
    dose: { sets: 3, holdS: 30, perSide: true },
    howTo: 'Balance on one leg with one fingertip resting on a counter, then close your eyes. Hold 30 s. Swap legs.',
    cues: ['Fingertip only – no leaning', 'Hips level', 'Let the ankle make small corrections'],
    mistake: 'Pressing hard on the counter so it takes your weight.',
    why: 'Rebuilds the ankle\'s balance reflexes after injury.',
    illustration: 'balance',
  },
  {
    id: 'bal-4', name: 'Single-leg balance – on a cushion', metric: 'hold', equipment: 'bodyweight', ladder: 'balance', level: 4,
    dose: { sets: 3, holdS: 30, perSide: true },
    howTo: 'Stand on one leg on a firm cushion or pad next to a counter and hold steady for 30 s. Swap legs.',
    cues: ['Knee soft, over the foot', 'Hips level', 'Counter nearby for safety'],
    mistake: 'Letting the knee wobble inward.',
    why: 'Rebuilds the ankle\'s balance reflexes after injury.',
    illustration: 'balance',
  },
  {
    id: 'heel-straight', name: 'Heel raises – straight knee', metric: 'reps', equipment: 'bodyweight',
    dose: { sets: 2, reps: 15, note: '3 s down' },
    howTo: 'Stand with the knees straight, fingertips on a wall for balance. Rise onto the balls of your feet with pressure over the big toe, then lower over 3 s.',
    cues: ['Pressure over the big toe', 'Straight up, not rolling out', '3 s on the way down'],
    mistake: 'Ankles rolling outward so weight shifts to the little toes.',
    why: 'Builds calf strength (gastrocnemius) for walking and running.',
    illustration: 'heelstraight',
  },
  {
    id: 'heel-bent', name: 'Heel raises – bent knee (soleus)', metric: 'reps', equipment: 'bodyweight',
    dose: { sets: 2, reps: 15 },
    howTo: 'Stand with the knees bent about 30° and keep that bend throughout. Rise onto the balls of your feet, then lower under control.',
    cues: ['Knee bend stays the same', 'Pressure over the big toe', 'Controlled lowering'],
    mistake: 'Straightening the knees as you rise.',
    why: 'Targets the soleus, the deep calf muscle that takes most load when running.',
    illustration: 'heelbent',
  },
  {
    id: 'wall-sit-1', name: 'Wall sit – shallow (about 45°)', metric: 'hold', equipment: 'bodyweight', ladder: 'wallsit', level: 1,
    dose: { sets: 3, holdS: 45, note: '~7/10 effort' },
    howTo: 'Slide your back down a wall until your knees are bent about 45° (a short slide down), and hold. Spanish squat option at the same depth: loop a heavy band behind both knees anchored in front, sit back with shins vertical, and hold.',
    cues: ['Knees over the feet', 'Weight through the whole foot', 'Effort about 7/10'],
    mistake: 'Going deeper than the level and turning a pain-easing hold into a painful one.',
    why: 'Long holds load the knee tendon while usually easing pain.',
    illustration: 'wallsit',
  },
  {
    id: 'wall-sit-2', name: 'Wall sit – medium (about 60°)', metric: 'hold', equipment: 'bodyweight', ladder: 'wallsit', level: 2,
    dose: { sets: 3, holdS: 45, note: '~7/10 effort' },
    howTo: 'Slide your back down a wall until your knees are bent about 60°, and hold. Spanish squat option at the same depth: loop a heavy band behind both knees anchored in front, sit back with shins vertical, and hold.',
    cues: ['Knees over the feet', 'Weight through the whole foot', 'Effort about 7/10'],
    mistake: 'Going deeper than the level and turning a pain-easing hold into a painful one.',
    why: 'Long holds load the knee tendon while usually easing pain.',
    illustration: 'wallsit',
  },
  {
    id: 'wall-sit-3', name: 'Wall sit – deep (thighs near level)', metric: 'hold', equipment: 'bodyweight', ladder: 'wallsit', level: 3,
    dose: { sets: 3, holdS: 45, note: '~7/10 effort' },
    howTo: 'Slide your back down a wall until your knees are bent until your thighs are close to level with the floor, and hold. Spanish squat option at the same depth: loop a heavy band behind both knees anchored in front, sit back with shins vertical, and hold.',
    cues: ['Knees over the feet', 'Weight through the whole foot', 'Effort about 7/10'],
    mistake: 'Going deeper than the level and turning a pain-easing hold into a painful one.',
    why: 'Long holds load the knee tendon while usually easing pain.',
    illustration: 'wallsit',
  },
  {
    id: 'side-plank', name: 'Side plank with top-leg lift', metric: 'hold', equipment: 'bodyweight',
    dose: { sets: 2, holdS: 20, perSide: true },
    howTo: 'Lie on your side, elbow under shoulder. Lift the hips into a straight line, then raise the top leg and hold it up for 20 s. Swap sides.',
    cues: ['Elbow under shoulder', 'Hips up and forward – body in one line', 'Top leg straight, toes forward'],
    mistake: 'Hips sagging or piking back.',
    why: 'Strengthens the side hip muscles that control the knee.',
    illustration: 'sideplank',
  },

  // ---------- Leg days ----------
  {
    id: 'leg-press', name: 'Leg press', metric: 'reps', equipment: 'machine', dose: { sets: 3, reps: 12 },
    howTo: 'Feet hip-width on the platform. Lower until the knees reach about 90° or your pain-free depth, then press back up without locking out.',
    cues: ['Knees track over toes', 'Lower back stays on the pad', 'Smooth tempo'],
    mistake: 'Letting the hips roll off the seat at the bottom.',
    why: 'Builds quad and glute strength with the trunk supported.',
    photos: ph('Leg_Press'),
  },
  {
    id: 'hip-abd', aliases: ['Hip abduction', 'Abductor machine'], name: 'Machine hip abduction', metric: 'reps', equipment: 'machine', dose: { sets: 3, reps: 15, repsMax: 20 },
    howTo: 'Sit tall with pads on the outside of the knees. Push the knees apart, pause, and return slowly.',
    cues: ['Sit tall', 'Pause at the widest point', 'Slow return'],
    mistake: 'Letting the weight stack slam between reps.',
    why: 'Strong hip abductors help stop the knee caving in.',
    photos: ph('Thigh_Abductor'),
  },
  {
    id: 'leg-ext', name: 'Leg extension', metric: 'reps', equipment: 'machine', dose: { sets: 3, reps: 15 },
    howTo: 'Pad on the lower shin, knee lined up with the machine pivot. Straighten the knees, pause, and lower slowly.',
    cues: ['Squeeze at the top', '2–3 s on the way down', 'Stay in a pain-free range'],
    mistake: 'Swinging the weight up with momentum.',
    why: 'Isolates the quads, which protect the front of the knee.',
    photos: ph('Leg_Extensions'),
  },
  {
    id: 'seated-calf', name: 'Seated calf raise', metric: 'reps', equipment: 'machine', dose: { sets: 3, reps: 15 },
    howTo: 'Balls of the feet on the platform, pad on the thighs. Lower the heels for a stretch, then rise high onto the toes.',
    cues: ['Full stretch at the bottom', 'Pressure over the big toe', 'Pause at the top'],
    mistake: 'Bouncing out of the bottom.',
    why: 'Loads the soleus, the deep calf muscle.',
    photos: ph('Seated_Calf_Raise'),
  },
  {
    id: 'db-rdl', aliases: ['RDL', 'DB RDL', 'Romanian deadlift', 'Dumbbell Romanian deadlift'], name: 'Dumbbell RDL', metric: 'reps', equipment: 'dumbbell', dose: { sets: 3, reps: 10 },
    howTo: 'Hold dumbbells in front of the thighs. With soft knees, push the hips back and slide the weights down the legs until you feel the hamstrings stretch, then drive the hips forward to stand.',
    cues: ['Hips back, not down', 'Back flat', 'Weights close to the legs'],
    mistake: 'Rounding the back to reach lower.',
    why: 'Strengthens the hamstrings and glutes.',
    photos: ph('Romanian_Deadlift'), photoNote: 'Photo shows the barbell version; the movement is the same.',
  },
  {
    id: 'glute-bridge', name: 'Glute bridge', metric: 'reps', equipment: 'bodyweight', dose: { sets: 3, reps: 12 },
    howTo: 'Lie on your back, knees bent, feet flat. Push through the heels to lift the hips until the body is straight from shoulders to knees, pause, then lower.',
    cues: ['Squeeze the glutes at the top', 'Ribs down, no arching', 'Push through the heels'],
    mistake: 'Over-arching the lower back instead of using the glutes.',
    why: 'Builds glute strength to support the knee.',
    photos: ph('Barbell_Glute_Bridge'), photoNote: 'Photo shows the barbell version; start with bodyweight.',
  },
  {
    id: 'step-up', name: 'Low-box step-up', metric: 'reps', equipment: 'dumbbell', dose: { sets: 3, reps: 8, perSide: true },
    howTo: 'Place one whole foot on a low box. Drive through that foot to stand up on the box, then step down slowly with control.',
    cues: ['Knee tracks over the 2nd toe', 'Push through the top foot, not the back one', 'Slow on the way down'],
    mistake: 'Pushing off the bottom foot to bounce up.',
    why: 'Single-leg strength that carries over to stairs and running.',
    photos: ph('Dumbbell_Step_Ups'),
  },
  {
    id: 'spanish-hold', aliases: ['Spanish squat'], name: 'Spanish squat / leg-extension hold', metric: 'hold', equipment: 'band', dose: { sets: 4, holdS: 45 },
    howTo: 'Spanish squat: heavy band behind both knees, anchored in front; sit back with shins vertical and hold. Or hold a leg extension at about 60° knee bend.',
    cues: ['Effort about 7/10', 'Shins vertical (Spanish squat)', 'Knee pain should ease or stay ≤ 3/10'],
    mistake: 'Holding so heavy that the knee hurts more.',
    why: 'Long holds load the knee tendon while usually easing pain.',
    illustration: 'wallsit',
  },
  {
    id: 'he-squat', aliases: ['Goblet squat', 'Heels-elevated goblet squat'], name: 'Heels-elevated goblet squat', metric: 'reps', equipment: 'dumbbell', ladder: 'squat', level: 1,
    dose: { sets: 4, reps: 6, repsMax: 8 },
    howTo: 'Heels on a small wedge or plates, holding a dumbbell at your chest. Squat down between your knees keeping the chest up, then stand.',
    cues: ['Knees forward over toes', 'Chest up', 'Whole foot pressing down'],
    mistake: 'Dropping the chest and turning it into a good-morning.',
    why: 'Loads the quads through a deep knee bend.',
    photos: ph('Goblet_Squat'), photoNote: 'Photo shows a flat-heel goblet squat.',
  },
  {
    id: 'he-back-squat', aliases: ['Back squat', 'Heels-elevated back squat'], name: 'Heels-elevated back squat', metric: 'reps', equipment: 'barbell', ladder: 'squat', level: 2,
    dose: { sets: 4, reps: 6, repsMax: 8 },
    howTo: 'Heels on a small wedge or plates, bar across the upper back. Squat down with the knees travelling forward over the toes, chest up, then stand. Start light – lighter than your goblet weight feels – and build up.',
    cues: ['Brace before each rep', 'Knees forward over toes', 'Bar over mid-foot'],
    mistake: 'Starting too heavy because the goblet squat felt easy.',
    why: 'Lets the squat keep getting heavier once a dumbbell is no longer enough.',
    photos: ph('Goblet_Squat'), photoNote: 'Photo shows a goblet squat; the barbell version moves the same way.',
  },
  {
    id: 'bss', aliases: ['BSS', 'Split squat'], name: 'Bulgarian split squat', metric: 'reps', equipment: 'dumbbell', dose: { sets: 3, reps: 8, perSide: true },
    howTo: 'Rear foot on a bench behind you, front foot far enough forward to drop straight down. Lower until the back knee nearly touches the floor, then drive up through the front foot.',
    cues: ['Front knee over the toes', 'Torso slightly forward', 'Control the bottom'],
    mistake: 'Front foot too close so the heel lifts.',
    why: 'Single-leg strength and balance under load.',
    photos: ph('One_Leg_Barbell_Squat'), photoNote: 'Photo shows the barbell version.',
  },
  {
    id: 'sl-calf', aliases: ['Single-leg calf raise'], name: 'Single-leg calf raise on a step', metric: 'reps', equipment: 'bodyweight', dose: { sets: 3, reps: 10, repsMax: 12 },
    howTo: 'Stand on one foot on the edge of a step. Lower the heel below the step, then rise as high as you can.',
    cues: ['Full range', 'Pressure over the big toe', 'Slow lowering'],
    mistake: 'Bouncing at the bottom.',
    why: 'Builds calf strength toward the 25-rep target.',
    photos: ph('Standing_Dumbbell_Calf_Raise'), photoNote: 'Photo shows a two-leg version.',
  },
  {
    id: 'deadlift', name: 'Trap-bar or Romanian deadlift', metric: 'reps', equipment: 'barbell', dose: { sets: 4, reps: 6, repsMax: 8 },
    howTo: 'Trap bar: stand in the middle, hips back, grab the handles, then stand up by pushing the floor away. RDL: from standing, push the hips back with soft knees and lower to mid-shin, then stand.',
    cues: ['Back flat', 'Brace before each rep', 'Bar close to the body'],
    mistake: 'Rounding the back or jerking the bar off the floor.',
    why: 'Heavy hip and hamstring strength.',
    photos: ph('Trap_Bar_Deadlift'),
  },
  {
    id: 'hip-thrust', name: 'Barbell hip thrust', metric: 'reps', equipment: 'barbell', dose: { sets: 3, reps: 8, repsMax: 10 },
    howTo: 'Upper back against a bench, bar padded over the hips. Drive through the heels to lift the hips until the thighs are level, pause, and lower.',
    cues: ['Chin tucked', 'Shins vertical at the top', 'Squeeze the glutes'],
    mistake: 'Arching the lower back at the top.',
    why: 'Builds glute strength.',
    photos: ph('Barbell_Hip_Thrust'),
  },
  {
    id: 'lat-stepdown', name: 'Lateral step-down', metric: 'reps', equipment: 'bodyweight', dose: { sets: 3, reps: 8, perSide: true },
    howTo: 'Stand side-on on a low step. Slowly bend the standing knee to lower the other heel to the floor beside the step, tap lightly, and stand back up.',
    cues: ['Knee tracks over the 2nd toe', 'Hips level', 'Tap, don\'t step down'],
    mistake: 'Knee caving inward as you lower.',
    why: 'Trains knee control on the way down, like stairs.',
  },
  {
    id: 'cable-abd', name: 'Standing cable hip abduction', metric: 'reps', equipment: 'cable', dose: { sets: 3, reps: 12, perSide: true },
    howTo: 'Ankle cuff on the outer leg, side-on to a low pulley. Standing tall, sweep the leg out to the side, pause, and return slowly.',
    cues: ['Stand tall, no leaning', 'Toes forward', 'Slow return'],
    mistake: 'Leaning the trunk to swing the leg higher.',
    why: 'Hip strength that keeps the knee lined up.',
  },
  {
    id: 'ham-curl', aliases: ['Leg curl', 'Seated leg curl', 'Lying leg curl'], name: 'Hamstring curl', metric: 'reps', equipment: 'machine', dose: { sets: 3, reps: 10, repsMax: 12 },
    howTo: 'Line the knee up with the machine pivot. Curl the pad toward you, pause, and return slowly.',
    cues: ['Hips stay on the pad', 'Slow on the way back', 'Full range'],
    mistake: 'Hips lifting to swing the weight.',
    why: 'Hamstring strength balances the quads around the knee.',
    photos: ph('Seated_Leg_Curl'),
  },
  {
    id: 'sl-rdl', name: 'Single-leg RDL reach', metric: 'reps', equipment: 'bodyweight', dose: { sets: 2, reps: 8, perSide: true },
    howTo: 'Stand on one leg with a soft knee. Hinge at the hip and reach forward while the free leg extends behind you, then return to standing.',
    cues: ['Hips square to the floor', 'Standing knee soft', 'Move slowly'],
    mistake: 'Opening the hip so the back leg turns out.',
    why: 'Combines balance with hip and hamstring control.',
    photos: ph('Kettlebell_One-Legged_Deadlift'), photoNote: 'Photo shows a loaded version.',
  },
  {
    id: 'farmers', aliases: ['Farmers walk', 'Farmer carry'], name: "Farmer's carry", metric: 'carry', equipment: 'dumbbell', dose: { sets: 3, carryM: 30 },
    howTo: 'Hold a heavy dumbbell in each hand and walk 30 m with short, controlled steps.',
    cues: ['Tall posture', 'Shoulders down', 'Heel-to-toe steps'],
    mistake: 'Leaning to one side or shuffling.',
    why: 'Trunk and ankle stability while walking under load.',
    photos: ph('Farmers_Walk'),
  },
];

export const EX: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const LADDERS: Record<LadderId, Ladder> = {
  tibialis: {
    id: 'tibialis', name: 'Tibialis progression',
    levels: ['tib-1', 'tib-2', 'tib-3', 'tib-4', 'tib-5', 'tib-6', 'tib-7'],
    quality: 'Full dose with full range, relaxed toes and no cramping',
  },
  balance: {
    id: 'balance', name: 'Single-leg balance',
    levels: ['bal-1', 'bal-2', 'bal-3', 'bal-4'],
    quality: 'Full 30 s holds with no touch-downs',
  },
  shortfoot: {
    id: 'shortfoot', name: 'Short foot',
    levels: ['sf-1', 'sf-2', 'sf-3'],
    quality: 'All holds without the toes curling',
  },
  wallsit: {
    id: 'wallsit', name: 'Wall sit depth',
    levels: ['wall-sit-1', 'wall-sit-2', 'wall-sit-3'],
    quality: 'Full 45 s holds at about 7/10 effort with knee pain 2/10 or less',
  },
  squat: {
    id: 'squat', name: 'Squat (goblet → back squat)',
    levels: ['he-squat', 'he-back-squat'],
    quality: 'All 4×8 with heels down and chest up, knee pain 2/10 or less, on the heaviest dumbbell you can hold comfortably',
  },
};

export const MORNING: Slot[] = [
  { ref: 'ktw' },
  { ref: 'slant' },
  { ref: 'shortfoot', ladder: true },
  { ref: 'toe-yoga' },
  { ref: 'tibialis', ladder: true },
  { ref: 'clam' },
];

export const EVENING: Slot[] = [
  { ref: 'balance', ladder: true },
  { ref: 'heel-straight' },
  { ref: 'heel-bent' },
  { ref: 'wallsit', ladder: true },
  { ref: 'side-plank' },
];

export const LEG_DAYS: Record<Phase, Record<'legA' | 'legB', Slot[]>> = {
  '20': {
    legA: [
      { ref: 'leg-press', pair: 'A1' },
      { ref: 'hip-abd', pair: 'A2' },
      { ref: 'leg-ext', pair: 'B1' },
      { ref: 'seated-calf', pair: 'B2' },
    ],
    legB: [
      { ref: 'db-rdl', pair: 'A1' },
      { ref: 'glute-bridge', pair: 'A2' },
      { ref: 'step-up', pair: 'B1' },
      { ref: 'tibialis', ladder: true, pair: 'B2' },
    ],
  },
  '45': {
    legA: [
      { ref: 'spanish-hold' },
      { ref: 'squat', ladder: true },
      { ref: 'bss' },
      { ref: 'leg-ext', dose: { sets: 3, reps: 12, repsMax: 15 } },
      { ref: 'hip-abd' },
      { ref: 'sl-calf', pair: 'A1' },
      { ref: 'seated-calf', pair: 'A2' },
    ],
    legB: [
      { ref: 'deadlift' },
      { ref: 'hip-thrust' },
      { ref: 'lat-stepdown' },
      { ref: 'cable-abd' },
      { ref: 'ham-curl' },
      { ref: 'tibialis', ladder: true, pair: 'A1' },
      { ref: 'sl-rdl', pair: 'A2' },
      { ref: 'farmers' },
    ],
  },
};

export const SESSION_NAMES: Record<SessionId, string> = {
  legA: 'Leg day A',
  legB: 'Leg day B',
  morning: 'Morning routine',
  evening: 'Evening routine',
};

export const PHASE_SWITCH_DATE = '2026-12-14';
export const BASELINE_DATE = '2026-11-25';

export const DEFAULT_SETTINGS: Settings = {
  phase: '20',
  steps: { barbell: 2.5, machine: 2.5, cable: 2.5, dumbbell: 2, bodyweight: 2.5, band: 1 },
  ladders: {
    tibialis: { level: 1, since: BASELINE_DATE },
    balance: { level: 1, since: BASELINE_DATE },
    shortfoot: { level: 1, since: BASELINE_DATE },
    wallsit: { level: 1, since: BASELINE_DATE },
    squat: { level: 1, since: BASELINE_DATE },
  },
};

export interface TestDef {
  key: 'walkingPain' | 'ktwR' | 'ktwL' | 'balR' | 'balL' | 'heelRaiseR' | 'heelRaiseL' | 'heelWalkM' | 'shortFootHolds';
  label: string;
  unit: string;
  better: 'lower' | 'higher' | 'keep';
  baseline?: number;
  baselineText: string;
  target?: number;
  targetText: string;
  max?: number;
}

export const TESTS: TestDef[] = [
  { key: 'walkingPain', label: 'Walking knee pain', unit: '/10', better: 'lower', baseline: 4, baselineText: '4', target: 1, targetText: '≤ 1', max: 10 },
  { key: 'ktwR', label: 'Knee-to-wall R', unit: 'cm', better: 'higher', baseline: 9, baselineText: '9', target: 12, targetText: '≥ 12, within 2 cm of L' },
  { key: 'ktwL', label: 'Knee-to-wall L', unit: 'cm', better: 'keep', baseline: 15, baselineText: '15', targetText: 'keep' },
  { key: 'balR', label: 'Eyes-closed balance R', unit: 's', better: 'higher', baselineText: 'under 10', target: 30, targetText: '30' },
  { key: 'balL', label: 'Eyes-closed balance L', unit: 's', better: 'higher', baselineText: 'under 10', target: 30, targetText: '30' },
  { key: 'heelRaiseR', label: 'Single-leg heel raises R', unit: 'reps', better: 'higher', baselineText: 'not tested', target: 25, targetText: '25+' },
  { key: 'heelRaiseL', label: 'Single-leg heel raises L', unit: 'reps', better: 'higher', baselineText: 'not tested', target: 25, targetText: '25+' },
  { key: 'heelWalkM', label: 'Heel walk', unit: 'm of 10', better: 'higher', baseline: 0, baselineText: '0', target: 10, targetText: '10', max: 10 },
  { key: 'shortFootHolds', label: 'Short-foot holds (R, no toe curl)', unit: 'of 10', better: 'higher', baselineText: 'not tested', target: 10, targetText: '10×10 s', max: 10 },
];

export function exerciseName(id: string, fallback?: string) {
  return EX[id]?.name ?? fallback ?? id.replace(/^custom:/, '');
}
