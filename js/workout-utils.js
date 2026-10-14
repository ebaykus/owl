// Antrenman hesaplamaları. Isınma setleri set sayısına ve hacme dahil edilmez.

export const workSets = sets => sets.filter(s => !s.warmup);

export const workoutSetCount = w => w.entries.reduce((n, e) => n + workSets(e.sets).length, 0);

export const workoutVolume = w =>
  w.entries.reduce((sum, e) => sum + workSets(e.sets).reduce((s, x) => s + x.weight * x.reps, 0), 0);

// 3125000 ms -> "52 dk" ; "1 sa 5 dk"
export function formatMinutes(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h} sa ${m % 60} dk` : `${m} dk`;
}

// Bir egzersizin setlerinin ekranda görünen numarası: ısınma "Is", diğerleri 1, 2, 3…
export function setLabels(sets) {
  let n = 0;
  return sets.map(s => (s.warmup ? 'Is' : String(++n)));
}
