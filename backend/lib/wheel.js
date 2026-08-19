/**
 * settings.wheel_outcomes formati:
 * [{ amount: 0, weight: 55 }, { amount: 200, weight: 25 }, ...]
 * weight — nisbiy ehtimollik og'irligi (foiz bo'lishi shart emas, nisbat muhim).
 */
export function pickWheelOutcome(outcomes) {
  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const outcome of outcomes) {
    if (roll < outcome.weight) return outcome;
    roll -= outcome.weight;
  }
  return outcomes[outcomes.length - 1];
}

/** Foydalanuvchi bugun (so'nggi 24 soat ichida) aylantirganmi? */
export function canSpinToday(lastSpinAt) {
  if (!lastSpinAt) return true;
  const last = new Date(lastSpinAt).getTime();
  const now = Date.now();
  return now - last >= 24 * 60 * 60 * 1000;
}

export function msUntilNextSpin(lastSpinAt) {
  if (!lastSpinAt) return 0;
  const last = new Date(lastSpinAt).getTime();
  const nextAllowed = last + 24 * 60 * 60 * 1000;
  return Math.max(0, nextAllowed - Date.now());
}
