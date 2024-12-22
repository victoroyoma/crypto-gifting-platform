import React from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import animationData from "../assets/crypto loading.json";

const AnimationComponent = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-64 h-64">
        <Player
          autoplay
          loop
          src={animationData}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default AnimationComponent;
