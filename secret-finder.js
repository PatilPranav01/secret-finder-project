const fs = require('fs');

function gcd(a, b) {
    while (b) {
        [a, b] = [b, a % b];
    }
    return a;
}

function lcm(a, b) {
    if (a === 0n || b === 0n) return 0n;
    return (a * b) / gcd(a, b);
}

function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('USAGE: node secret-finder.js <path_to_json_file>');
        return;
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        const allShares = data.shares.map(shareData => ({
            x: BigInt(shareData.t),
            y: computeShareValue(shareData.value_base)
        }));

        findCorrectSecret(data.k, allShares);

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

function computeShareValue(valueBase) {
    if (typeof valueBase === 'object' && valueBase !== null && !Array.isArray(valueBase)) {
        const op = valueBase.op;
        const values = valueBase.values.map(v => BigInt(v));

        if (!op || !values) {
            throw new Error('Invalid structured value_base: must have "op" and "values" properties.');
        }

        switch (op.toLowerCase()) {
            case 'sum':
                return values.reduce((acc, val) => acc + val, 0n);
            case 'multiply':
                return values.reduce((acc, val) => acc * val, 1n);
            case 'gcd':
            case 'hcf':
                return values.reduce((acc, val) => gcd(acc, val));
            case 'lcm':
                return values.reduce((acc, val) => lcm(acc, val));
            default:
                throw new Error(`Unsupported operation: ${op}`);
        }
    }
    return BigInt(valueBase);
}

function findCorrectSecret(k, allShares) {
    if (allShares.length < k) {
        console.error('Not enough shares to reconstruct the secret.');
        return;
    }

    const combinations = [];
    generateCombinations(allShares, k, 0, [], combinations);

    const secretCounts = new Map();

    for (const combo of combinations) {
        const secret = reconstructSecret(combo);
        if (secret !== null) {
            const secretString = secret.toString();
            secretCounts.set(secretString, (secretCounts.get(secretString) || 0) + 1);
        }
    }

    if (secretCounts.size === 0) {
        console.error('Could not reconstruct a valid secret from any combination.');
        return;
    }

    const majoritySecretEntry = [...secretCounts.entries()].reduce((a, b) => b[1] > a[1] ? b : a);
    const correctSecret = BigInt(majoritySecretEntry[0]);

    console.log(`Secret: ${correctSecret}`);

    const goodShares = new Set();
    for (const combo of combinations) {
        if (correctSecret === reconstructSecret(combo)) {
            // FIX: Create a simple string key instead of using JSON.stringify
            combo.forEach(share => goodShares.add(`${share.x}:${share.y}`));
        }
    }

    // FIX: Use the same simple string key to check for faulty shares
    const badShares = allShares.filter(share => !goodShares.has(`${share.x}:${share.y}`));

    if (badShares.length > 0) {
        console.log('Faulty Shares:');
        badShares.sort((a, b) => Number(a.x - b.x)).forEach(s => {
            console.log(`  t=${s.x}, value=${s.y}`);
        });
    }
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
            return null;
        }
        secret += termNumerator / denominator;
    }
    return secret;
}

function generateCombinations(allShares, k, start, current, combinations) {
    if (current.length === k) {
        combinations.push([...current]);
        return;
    }
    if (start >= allShares.length) {
        return;
    }
    current.push(allShares[start]);
    generateCombinations(allShares, k, start + 1, current, combinations);
    current.pop();
    generateCombinations(allShares, k, start + 1, current, combinations);
}

main();

//to check...(node secret-finder.js input.json) bash script