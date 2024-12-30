export const calculatePerFapUpgradeCost = (currentPerFap: number): number => {
    const upgraded = Math.ceil(currentPerFap * Math.log2(currentPerFap) * 5000 + 800);
    return upgraded;
}

export const calculateMilenaUpgradeCost = (currentMilena: number): number => {
    currentMilena += 1;
    const upgraded = Math.ceil(currentMilena * Math.log2(currentMilena) * 6000 + 15000);
    return upgraded;
}

export const toText = (n: number) => {
    if (n < 100)
        return n;

    n = Math.floor(n);

    if (n < 9_000)
        return n.toString();
    else if (n < 999_000)
        return `${(n / 1_000).toFixed(1)} tisíc`;
    else if (n < 999_000_000)
        return `${(n / 1_000_000).toFixed(2)} milionů`;
    else if (n < 999_000_000_000)
        return `${(n / 1_000_000_000).toFixed(2)} miliard`;
    else if (n < 999_000_000_000_000)
        return `${(n / 1_000_000_000_000).toFixed(2)} bilionů`;
    else if (n < 999_000_000_000_000_000)
        return `${(n / 1_000_000_000_000_000).toFixed(2)} kvadrilionů`;
    else
        return 'kurva hodně';
}