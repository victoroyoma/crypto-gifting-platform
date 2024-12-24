export const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export const getWalletDeepLink = (wallet, dappUrl) => {
  const encodedUrl = encodeURIComponent(dappUrl);
  switch (wallet) {
    case "metamask":
      return `https://metamask.app.link/dapp/${encodedUrl}`;
    case "phantom":
      return `https://phantom.app/ul/browse/${encodedUrl}`;
    case "okx":
      return `https://www.okx.com/web3/dapp/${encodedUrl}`;
    default:
      return null;
  }
};
