function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const testArr = [1, 2, 3, 4, 5, 6, 7, 8];
console.log("Original:", testArr);
for(let i=0; i<5; i++) {
    console.log("Shuffled " + i + ":", shuffleArray(testArr));
}
