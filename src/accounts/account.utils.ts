export function generateAccountNumber(bankId: string, agencyId: string, accountNumber: string): string {
  if(bankId.length !== 5 || agencyId.length !== 5 || accountNumber.length !== 11) {
    throw new Error("Invalid input length");
  }

  const baseNumber = `${bankId}${agencyId}${accountNumber}`;

  // Simple RIB key calculation (modulo 97)
  const ribKey = (97 - (parseInt(baseNumber) % 97)).toString().padStart(2, '0');

  return `${baseNumber}${ribKey}`;
}