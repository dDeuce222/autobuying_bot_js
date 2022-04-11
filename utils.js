module.exports = {
    indent: function(text, spaces) {
        let ret = text;
        if (text.toString().length > spaces) { return text.toString().substring(0, spaces + 1); }
        for (let i = spaces; i >= text.toString().length; i--) { ret = ret + ' '; }
        return ret;
    },
    printLiqBars: function(lastPrice, liqPrice, liqBarsThreshold) {

        let diff = Number((lastPrice - liqPrice))
        let percentual = (diff * 100) / liqBarsThreshold

        let ip = percentual / 10;

        if (percentual > 16.66)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 33.32)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 49.98)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 66.64)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 83.30)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 99.90)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

    },
    printCurrPriceBars: function(max24h, min24h, lastPrice) {

        currPriceBarsThreshold = max24h - min24h;

        let diff = Number((lastPrice - min24h))
        let percentual = (diff * 100) / currPriceBarsThreshold

        //console.log('currPriceBarsThreshold : ' + currPriceBarsThreshold)
        //console.log('max24h     : ' + max24h)
        //console.log('min24h     : ' + min24h)
        //console.log('diff       : ' + diff)
        //console.log('percentual : ' + percentual)

        let ip = percentual / 10;

        for (let i = 0; i < ip; i++) {
            process.stdout.write("»".brightGreen.bgBlack)
        }

        for (let i = 0; i < 9 - ip; i++) {
            process.stdout.write("»".red.bgBlack)
        }

    },
    printPriceRangeBars: function(entry, lastPrice, priceBarsThreshold) {

        let diff = Math.abs(Number((lastPrice - entry)))
        let percentual = (diff * 100) / priceBarsThreshold

        //console.log('currPriceBarsThreshold : ' + currPriceBarsThreshold)
        //console.log('max24h     : ' + max24h)
        //console.log('min24h     : ' + min24h)
        //console.log()
        //console.log('diff       : ' + diff)
        //console.log('percentual : ' + percentual)

        let ip = percentual / 10;
        //console.log('percentual :' + percentual)

        if (percentual > 100.00)
            process.stdout.write("»".red.bgBlack)
        else
            process.stdout.write("»".brightGreen.bgBlack)

        if (percentual > 80)
            process.stdout.write("»".red.bgBlack)
        else
            process.stdout.write("»".brightGreen.bgBlack)

        if (percentual > 60)
            process.stdout.write("»".red.bgBlack)
        else
            process.stdout.write("»".brightGreen.bgBlack)

        if (percentual > 40)
            process.stdout.write("»".red.bgBlack)
        else
            process.stdout.write("»".brightGreen.bgBlack)

        if (percentual > 20)
            process.stdout.write("»".red.bgBlack)
        else
            process.stdout.write("»".brightGreen.bgBlack)

        if (percentual > 0)
            process.stdout.write("»".red.bgBlack)
        else
            process.stdout.write("»".brightGreen.bgBlack)
    }

};