// Save this file as: solve.js
const fs = require('fs');

/**
 * Decodes a string value from a given base into a BigInt.
 * Handles bases from 2 to 36.
 * @param {string} valueStr The string representation of the number (e.g., "111", "aed7").
 * @param {number} base The numerical base (e.g., 2, 16).
 * @returns {BigInt} The decoded number as a BigInt.
 */
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

/**
 * Reconstructs the secret (the constant term 'c') from a list of k shares.
 * @param {Array<Object>} kShares A list of exactly k shares, each {x, y}.
 * @returns {BigInt} The reconstructed secret.
 */
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
            // This case should not happen if the problem guarantees valid shares.
            throw new Error("Inconsistent shares provided. Cannot solve for an integer secret.");
        }
        secret += termNumerator / denominator;
    }
    return secret;
}

/**
 * Reads a single JSON test case file, processes it, and finds the secret.
 * @param {string} filePath The path to the JSON file.
 */
function solveForFile(filePath) {
    try {
        console.log(`\n--- Processing: ${filePath} ---`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        const k = data.keys.k;
        const shares = [];

        // Iterate over the keys of the JSON object to find the shares
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

        // As per the problem, we only need k shares to solve. We'll take the first k.
        const sharesToUse = shares.slice(0, k);

        const secret = reconstructSecret(sharesToUse);
        console.log(`Secret (c): ${secret}`);

    } catch (error) {
        console.error(`Failed to process ${filePath}. Error: ${error.message}`);
    }
}

/**
 * Main function to run the script.
 * It can process multiple file paths passed as command-line arguments.
 */
function main() {
    const filePaths = process.argv.slice(2); // Get all arguments after 'node' and 'solve.js'

    if (filePaths.length === 0) {
        console.error('USAGE: node solve.js <file1.json> <file2.json> ...');
        return;
    }

    filePaths.forEach(solveForFile);
}

main();