import React from "react";
import { TwitterShareButton, FacebookShareButton, TwitterIcon, FacebookIcon } from "react-share";

const SocialShare = ({ charity, amount, token }) => {
  const shareMessage = `I just donated ${amount} ${token} to ${charity}! Join me in supporting this cause!`;

  return (
    <div className="mt-4">
      <h4 className="text-lg font-semibold">Share Your Donation</h4>
      <div className="flex items-center gap-4 mt-2">
        <TwitterShareButton
          url="https://x.com" // Replace with your platform URL
          title={shareMessage}
          hashtags={["CryptoDonation", "Charity"]}
        >
          <TwitterIcon size={32} round />
        </TwitterShareButton>
        <FacebookShareButton
          url="https://facebook.com" // Replace with your platform URL
          quote={shareMessage}
        >
          <FacebookIcon size={32} round />
        </FacebookShareButton>
      </div>
    </div>
  );
};

export default SocialShare;
