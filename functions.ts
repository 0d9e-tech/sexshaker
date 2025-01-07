export const calculatePerFapUpgradeCost = (currentPerFap: number): number => {
  const upgraded = Math.ceil(
    currentPerFap * Math.log2(currentPerFap) * 4000 + 800
  );
  return upgraded;
};

export const calculateMilenaUpgradeCost = (currentMilena: number): number => {
  currentMilena += 1;
  const upgraded = Math.ceil(
    currentMilena * Math.log2(currentMilena) * 4500 + 12000
  );
  return upgraded;
};

export const calculateHentaiUpgradeCost = (currentHentai: number): number => {
  currentHentai += 1;
  const upgraded = Math.ceil(
    currentHentai * Math.log2(currentHentai) * 25000 + 50000
  );
  return upgraded;
};

export const calculateHentaiMultiplier = (hentai: number): number => {
  return 1 + hentai / 20;
};

export const minuty = (n: number) => {
  if (n == 1) return "minutu";
  if (n > 1 && n < 5) return "minuty";
  else return "minut";
};

export const toText = (n: number) => {
  const decimals = n.toString().split(".")[1];
  if (n < 100) return Math.floor(n);

  n = Math.floor(n);

  if (n < 9_000) return n.toString();
  else if (n < 999_000) return `${(n / 1_000).toFixed(1)} tisíc`;
  else if (n < 999_000_000) return `${(n / 1_000_000).toFixed(2)} milionů`;
  else if (n < 999_000_000_000)
    return `${(n / 1_000_000_000).toFixed(2)} miliard`;
  else if (n < 999_000_000_000_000)
    return `${(n / 1_000_000_000_000).toFixed(2)} bilionů`;
  else if (n < 999_000_000_000_000_000)
    return `${(n / 1_000_000_000_000_000).toFixed(2)} kvadrilionů`;
  else return "kurva hodně";
};
