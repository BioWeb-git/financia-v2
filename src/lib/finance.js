/**
 * Calcule la mensualité d'un crédit
 */
export function calculateMonthlyPayment(principal, annualRate, durationYears, insuranceRate) {
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = durationYears * 12;
  
  let monthlyPrincipalAndInterest = 0;
  if (monthlyRate === 0) {
    monthlyPrincipalAndInterest = principal / numberOfPayments;
  } else {
    monthlyPrincipalAndInterest = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  }
  
  const monthlyInsurance = (principal * (insuranceRate / 100)) / 12;
  
  return {
    pi: monthlyPrincipalAndInterest,
    insurance: monthlyInsurance,
    total: monthlyPrincipalAndInterest + monthlyInsurance
  };
}

/**
 * Calcule l'impact de l'inflation sur une somme fixe
 */
export function calculateInflationImpact(amount, inflationRate, years) {
  // Valeur réelle = Montant / (1 + taux)^années
  return amount / Math.pow(1 + (inflationRate / 100), years);
}

/**
 * Calcule le seuil de rentabilité achat vs location
 * @param {number} buyPrice - Prix d'achat net vendeur
 * @param {number} rentPrice - Loyer mensuel équivalent
 * @param {number} appreciationRate - Taux de prise de valeur annuelle du bien
 * @param {number} maintenanceRate - Taux de charges/travaux annuels (ex: 1%)
 */
export function calculateBreakEven(buyPrice, rentPrice, monthlyPayment, notaryFees, appreciationRate = 1.5, maintenanceRate = 1) {
  let table = [];
  let totalRentPaid = 0;
  let currentPropertyValue = buyPrice;
  let remainingLoan = 0; // Simplifié pour le calcul de tendance
  
  // Simulation simplifiée sur 20 ans
  for (let year = 1; year <= 20; year++) {
    totalRentPaid += rentPrice * 12;
    currentPropertyValue *= (1 + appreciationRate / 100);
    
    // Coût total achat = Mensualités + Notaire + Maintenance
    const totalBuyCost = (monthlyPayment * 12 * year) + notaryFees + (buyPrice * (maintenanceRate / 100) * year);
    
    // Richesse si location = Épargne placée (simplifié)
    // Richesse si achat = Valeur Bien - Emprunt restant
    
    table.push({
      year,
      rentCost: totalRentPaid,
      buyCost: totalBuyCost,
      propertyValue: currentPropertyValue
    });
  }
  return table;
}

export function generateAmortizationTable(principal, annualRate, durationYears, insuranceRate) {
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = durationYears * 12;
  const { pi, insurance } = calculateMonthlyPayment(principal, annualRate, durationYears, insuranceRate);
  
  let remainingBalance = principal;
  const table = [];
  
  for (let i = 1; i <= numberOfPayments; i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = pi - interestPayment;
    remainingBalance -= principalPayment;
    
    table.push({
      month: i,
      interest: interestPayment,
      principal: principalPayment,
      insurance: insurance,
      total: pi + insurance,
      remainingBalance: Math.max(0, remainingBalance)
    });
  }
  
  return table;
}

export function capitalRestantDu(principal, annualRate, t) {
  const r = annualRate / 100 / 12;
  if (r === 0 || principal === 0) return Math.max(0, principal - (principal / (annualRate === 0 ? 1 : 1)) * t);
  const { pi } = calculateMonthlyPayment(principal, annualRate, Math.ceil(t / 12) + 1, 0);
  const cr = principal * Math.pow(1 + r, t) - pi * (Math.pow(1 + r, t) - 1) / r;
  return Math.max(0, cr);
}

export function capitalRestantDuExact(principal, annualRate, durationYears, t) {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = durationYears * 12;
  if (r === 0) return Math.max(0, principal * (1 - t / n));
  const { pi } = calculateMonthlyPayment(principal, annualRate, durationYears, 0);
  const cr = principal * Math.pow(1 + r, t) - pi * (Math.pow(1 + r, t) - 1) / r;
  return Math.max(0, cr);
}

export function newPaymentAfterRA(capitalRestant, montantRA, annualRate, remainingMonths, insuranceRate, initialPrincipal) {
  const newCapital = Math.max(0, capitalRestant - montantRA);
  const r = annualRate / 100 / 12;
  let newPi;
  if (r === 0 || remainingMonths <= 0) {
    newPi = remainingMonths > 0 ? newCapital / remainingMonths : 0;
  } else {
    newPi = (newCapital * r) / (1 - Math.pow(1 + r, -remainingMonths));
  }
  const insurance = (initialPrincipal * (insuranceRate / 100)) / 12;
  return { pi: newPi, insurance, total: newPi + insurance, newCapital };
}

export function newDurationAfterRA(capitalRestant, montantRA, annualRate, originalPi) {
  const newCapital = Math.max(0, capitalRestant - montantRA);
  if (newCapital <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0 || originalPi <= 0) return newCapital / originalPi;
  const n = -Math.log(1 - (newCapital * r) / originalPi) / Math.log(1 + r);
  return Math.ceil(n);
}

export function valeurPlacement(capitalInitial, epargneMensuelle, rendementAnnuel, mois) {
  if (mois <= 0) return capitalInitial;
  const r = rendementAnnuel / 100 / 12;
  if (r === 0) return capitalInitial + epargneMensuelle * mois;
  return capitalInitial * Math.pow(1 + r, mois) +
    epargneMensuelle * (Math.pow(1 + r, mois) - 1) / r;
}

export function calculateTotalCost(principal, annualRate, durationYears, insuranceRate) {
  const { total } = calculateMonthlyPayment(principal, annualRate, durationYears, insuranceRate);
  const totalPaid = total * durationYears * 12;
  return {
    totalPaid,
    totalInterests: totalPaid - principal,
    totalInsurance: (principal * (insuranceRate / 100)) * durationYears
  };
}
