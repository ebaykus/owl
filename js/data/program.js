// İlk açılışta yüklenen hazır şablonlar (kendi programın). Uygulamada Ayarlar > Şablonlar'dan değiştirilebilir.
// warmup: ısınma seti sayısı, sets: çalışma seti sayısı, reps: hedef tekrar ("8", "15-20" ya da boş)
const ex = (exerciseId, sets, reps, warmup = 0) => ({ exerciseId, warmup, sets, reps: String(reps) });

const push = second => [
  ex('bench-press', 2, 8, 1),
  second,
  ex('pec-deck', 3, ''),
  ex('lateral-raise', 3, 12),
  ex('cable-overhead-triceps-extension', 3, 10),
  ex('triceps-pushdown', 2, 10),
];

const pull = row => [
  ex('lat-pulldown', 2, 8, 1),
  ex(row, 2, 8, 1),
  ex('cable-pullover', 2, 10),
  ex('rear-delt-fly', 3, 10),
  ex('biceps-curl', 3, 10),
  ex('hammer-curl', 2, 8),
];

export const SEED_TEMPLATES = [
  { id: 'push-1', name: 'Push 1', order: 0, exercises: push(ex('incline-dumbbell-press', 2, 8)) },
  { id: 'pull-1', name: 'Pull 1', order: 1, exercises: pull('barbell-row') },
  {
    id: 'bacak', name: 'Bacak', order: 2, exercises: [
      ex('hack-squat', 2, 8, 1),
      ex('leg-press', 3, 10),
      ex('leg-extension', 3, 10),
      ex('leg-curl', 4, 10),
      ex('calf-raise', 3, 10),
    ],
  },
  { id: 'push-2', name: 'Push 2', order: 3, exercises: push(ex('dumbbell-shoulder-press', 2, 8, 1)) },
  { id: 'pull-2', name: 'Pull 2', order: 4, exercises: pull('reverse-grip-barbell-row') },
];
