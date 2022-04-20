class Dictionary {
    constructor(wordsArray) {
        this.dict = new Set(wordsArray)
    }

    isInDict(word) {
        return this.dict.has(word)

    }
}

const test = new Dictionary(['cat', 'car', 'bar'])
const test2 = new Dictionary([{ "obid": 1, "word": 'cat' }, { "obid": 2, "word": 'car' }, { "obid": 3, "word": 'bar' }])

console.log(test.isInDict('cat'))
console.log(test.isInDict('dog'))

console.log(test2.isInDict({ "obid": 1, "word": 'cat' }))
console.log(test2.isInDict({ "word": 'dog' }))