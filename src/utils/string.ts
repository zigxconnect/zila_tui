export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;

  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(0),
  );

  // initialize the first row and column
  for (let i = 0; i < rows; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j < cols; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const deletion = matrix[i - 1]![j]! + 1;
      const insertion = matrix[i]![j - 1]! + 1;
      const substitution =
        matrix[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);

      matrix[i]![j] = Math.min(deletion, insertion, substitution);
    }
  }
  return matrix[rows - 1]![cols - 1]!;
}
