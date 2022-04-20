module.exports = {
    indent: function(text, spaces, indentLeft) {

        let ret = text;
        if (text.toString().length > spaces) { return text.toString().substring(0, spaces + 1); }
        for (let i = spaces; i >= text.toString().length; i--) {

            if (indentLeft)
                ret = ' ' + ret
            else ret = ret + ' '
        }
        return ret;
    },
    printLiqBars: function(lastPrice, liqPrice, liqBarsThreshold) {

        let diff = Number((lastPrice - liqPrice))
        let percentual = (diff * 100) / liqBarsThreshold

        if (percentual > 12.5)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 25)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 37.5)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 50)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 62.5)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 75)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 87.5)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

        if (percentual > 100)
            process.stdout.write("»".brightGreen.bgBlack)
        else
            process.stdout.write("»".red.bgBlack)

    },
    printCurrPriceBars: function(max24h, min24h, lastPrice) {

        currPriceBarsThreshold = max24h - min24h;

        let diff = Number((lastPrice - min24h))
        let percentual = (diff * 100) / currPriceBarsThreshold

        let ip = percentual / 10;

        for (let i = 0; i < ip; i++) {
            process.stdout.write("»".brightGreen.bgBlack)
        }

        for (let i = 0; i < 9 - ip; i++) {
            process.stdout.write("»".red.bgBlack)
        }

    },
    printPriceRangeBars: function(entry, lastPrice, range, priceDistThreshold, isLongActive) {

        let diff = Math.abs(Number((lastPrice - entry)))
        let percentual = 0;

        if (Number((lastPrice - entry)) < 0) {
            //console.log('cinza ' + Number((lastPrice - entry)))
            percentual = (diff / priceDistThreshold) * 100

            if (percentual < 90)
                process.stdout.write("»".cyan.bgBlack)
            else
                process.stdout.write("»".brightRed.bgBlack)

            if (percentual < 65)
                process.stdout.write("»".cyan.bgBlack)
            else
                process.stdout.write("»".brightRed.bgBlack)

            if (percentual < 50)
                process.stdout.write("»".cyan.bgBlack)
            else
                process.stdout.write("»".brightRed.bgBlack)

            if (percentual < 20)
                process.stdout.write("»".cyan.bgBlack)
            else
                process.stdout.write("»".brightRed.bgBlack)

            if (percentual < 5)
                process.stdout.write("»".cyan.bgBlack)
            else
                process.stdout.write("»".brightRed.bgBlack)

            process.stdout.write("»".brightRed.bgBlack)


        } else {

            //console.log('normal ' + Number((lastPrice - entry)))

            if (diff > range && !isLongActive) {
                process.stdout.write(" LONG ".yellow.bgRed)
            } else if (diff > range) {
                process.stdout.write(" SELL ".yellow.bgBlue)

            } else {
                percentual = (diff / range) * 100
                    //console.log('percentual ' + percentual)


                if (percentual > 0)
                    process.stdout.write("»".brightYellow.bgBlack)
                else
                    process.stdout.write("»".cyan.bgBlack)

                if (percentual > 20)
                    process.stdout.write("»".brightYellow.bgBlack)
                else
                    process.stdout.write("»".cyan.bgBlack)

                if (percentual > 50)
                    process.stdout.write("»".brightYellow.bgBlack)
                else
                    process.stdout.write("»".cyan.bgBlack)

                if (percentual > 65)
                    process.stdout.write("»".brightYellow.bgBlack)
                else
                    process.stdout.write("»".cyan.bgBlack)

                if (percentual > 90)
                    process.stdout.write("»".brightYellow.bgBlack)
                else
                    process.stdout.write("»".cyan.bgBlack)

                process.stdout.write("»".cyan.bgBlack)

            }

        }

    }

};