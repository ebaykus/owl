// İlk açılışta yüklenen hazır egzersizler. Kendi egzersizlerin "Diğer" grubuna eklenir.
const list = {
  'Göğüs': ['Bench press', 'Incline bench press', 'Dumbbell press', 'Incline dumbbell press', 'Cable fly', 'Pec deck', 'Dips', 'Şınav'],
  'Sırt': ['Deadlift', 'Barfiks', 'Lat pulldown', 'Barbell row', 'Reverse grip barbell row', 'Dumbbell row', 'Seated cable row', 'T-bar row', 'Cable pullover', 'Face pull'],
  'Bacak': ['Squat', 'Hack squat', 'Leg press', 'Romanian deadlift', 'Leg extension', 'Leg curl', 'Lunge', 'Bulgarian split squat', 'Hip thrust', 'Calf raise'],
  'Omuz': ['Overhead press', 'Dumbbell shoulder press', 'Lateral raise', 'Front raise', 'Rear delt fly', 'Shrug'],
  'Kol': ['Biceps curl', 'Barbell curl', 'Dumbbell curl', 'Hammer curl', 'Preacher curl', 'Triceps pushdown', 'Skull crusher', 'Overhead triceps extension', 'Cable overhead triceps extension'],
  'Karın': ['Crunch', 'Cable crunch', 'Hanging leg raise', 'Ab wheel'],
};

const slug = name => name.toLowerCase().replace(/ş/g, 's').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-');

export const SEED_EXERCISES = Object.entries(list).flatMap(([group, names]) =>
  names.map(name => ({ id: slug(name), name, group }))
);
