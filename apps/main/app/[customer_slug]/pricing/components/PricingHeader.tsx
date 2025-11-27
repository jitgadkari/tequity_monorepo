const svgPaths = {
  p317b3200: "M17.3032 1.1203C24.8548 0.959209 32.4106 0.855653 39.9663 0.809627C47.5221 0.763602 55.008 0.778944 62.5268 0.851817C66.798 0.894007 71.0732 0.951538 75.3444 1.02825L75.9241 0.241985C66.1731 0.399237 56.4262 0.594844 46.6794 0.828805C36.9325 1.06277 27.1857 1.33508 17.4388 1.64959C11.9672 1.82602 6.4998 2.01012 1.02824 2.20956C0.707594 2.22106 0.226623 2.29777 0.0457451 2.58926C-0.1228 2.86158 0.189625 3.00349 0.44861 2.99582C10.6066 2.75419 20.7727 2.73118 30.9348 2.93062C41.0968 3.13006 51.2507 3.55579 61.3922 4.20014C67.0898 4.56067 72.7834 4.99408 78.4687 5.49652C78.777 5.52337 79.2868 5.38145 79.4512 5.11681C79.6321 4.82915 79.295 4.72943 79.0483 4.71026C68.9315 3.8166 58.79 3.14157 48.6403 2.68899C38.4905 2.23641 28.3244 2.01012 18.1623 2.00628C12.4523 2.00628 6.74234 2.07148 1.03235 2.20956L0.452721 2.99582C10.1955 2.63913 19.9423 2.32462 29.6892 2.04463C39.436 1.76848 49.1829 1.52685 58.9298 1.32741C64.4013 1.21618 69.877 1.11263 75.3485 1.02441C75.6692 1.02058 76.1543 0.932361 76.331 0.644704C76.5078 0.357047 76.1831 0.241985 75.9282 0.238149C68.3683 0.107745 60.8166 0.0272007 53.2609 0.00802355C45.7051 -0.0111536 38.2192 0.0233653 30.7005 0.119251C26.4293 0.172947 22.154 0.24582 17.8828 0.33787C17.5621 0.345541 17.0771 0.42992 16.9003 0.717577C16.7317 0.989892 17.0442 1.1318 17.3032 1.12413V1.1203Z",
};

function Scribble() {
  return (
    <div className="absolute h-[5.5px] left-[162.4px] top-[32px] sm:left-[162.4px] sm:top-[32px] w-[79.5px]" data-name="Scribble">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 80 6">
        <g clipPath="url(#clip0_1_31)" id="Scribble">
          <path d={svgPaths.p317b3200} fill="#C51A60" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_1_31">
            <rect fill="white" height="5.5" width="79.5" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

interface PricingHeaderProps {
  plusJakartaSansClass: string;
  instrumentSerifClass: string;
}

export function PricingHeader({ plusJakartaSansClass, instrumentSerifClass }: PricingHeaderProps) {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative w-full">
      <div className={`flex flex-col ${plusJakartaSansClass} font-normal justify-center leading-[0] relative shrink-0 text-[32px] text-slate-950 w-full max-w-[504px]`}>
        <p className="leading-[40px]">
          <span>Try Tequity </span>
          <span className="font-semibold">FREE</span>
          <span className="hidden sm:inline"> for 30-Days</span>
        </p>
        <p className="leading-[40px] sm:hidden">
          <span>for 30-Days</span>
        </p>
      </div>
      <div className={`flex flex-col ${instrumentSerifClass} justify-center leading-[0] not-italic relative shrink-0 text-[32px] text-slate-950`}>
        <p className="leading-[40px]">No credit card required.</p>
      </div>
      <Scribble />
    </div>
  );
}
