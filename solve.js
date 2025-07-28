const fs = require('fs');

function decodeValue(valueStr, base) {
    const bigBase = BigInt(base);
    let result = 0n;
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

    for (const char of valueStr.toLowerCase()) {
        const digitValue = BigInt(alphabet.indexOf(char));
        if (digitValue === -1n || digitValue >= bigBase) {
            throw new Error(`Invalid character '${char}' for base ${base}`);
        }
        result = result * bigBase + digitValue;
    }
    return result;
}

function reconstructSecret(kShares) {
    let secret = 0n;

    for (let j = 0; j < kShares.length; j++) {
        const currentShare = kShares[j];
        let numerator = 1n;
        let denominator = 1n;

        for (let m = 0; m < kShares.length; m++) {
            if (m === j) continue;
            const otherShare = kShares[m];
            numerator *= otherShare.x;
            denominator *= (otherShare.x - currentShare.x);
        }

        const termNumerator = currentShare.y * numerator;
        if (termNumerator % denominator !== 0n) {
            throw new Error("Inconsistent shares provided. Cannot solve for an integer secret.");
        }
        secret += termNumerator / denominator;
    }
    return secret;
}

function solveForFile(filePath) {
    try {
        console.log(`\n--- Processing: ${filePath} ---`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        const k = data.keys.k;
        const shares = [];

        for (const key in data) {
            if (key !== "keys") {
                const x = BigInt(key);
                const y = decodeValue(data[key].value, parseInt(data[key].base, 10));
                shares.push({ x, y });
            }
        }

        if (shares.length < k) {
            console.error(`Error: Not enough shares provided. Need ${k}, but only have ${shares.length}.`);
            return;
        }

        const sharesToUse = shares.slice(0, k);

        const secret = reconstructSecret(sharesToUse);
        console.log(`Secret (c): ${secret}`);

    } catch (error) {
        console.error(`Failed to process ${filePath}. Error: ${error.message}`);
    }
}

function main() {
    const filePaths = process.argv.slice(2);

    if (filePaths.length === 0) {
        console.error('USAGE: node solve.js <file1.json> <file2.json> ...');
        return;
    }

    filePaths.forEach(solveForFile);
}

main();
