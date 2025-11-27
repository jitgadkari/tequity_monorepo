import React from "react";

const svgPaths = {
  p1ce53700:
    "M56.3333 15.1667C59.9232 15.1667 62.8333 18.0768 62.8333 21.6667V54.1667C62.8333 57.7565 59.9232 60.6667 56.3333 60.6667H28.1667C24.5768 60.6667 21.6667 57.7565 21.6667 54.1667L21.6667 21.6667C21.6667 18.0768 24.5768 15.1667 28.1667 15.1667L56.3333 15.1667Z",
  p29a4f00:
    "M43.1382 30.8856C43.3851 30.936 43.5708 31.155 43.5708 31.4168C43.5706 31.6785 43.385 31.8967 43.1382 31.9471L43.0288 31.9578H35.7495C35.4505 31.9578 35.2078 31.7158 35.2075 31.4168C35.2075 31.1177 35.4504 30.8748 35.7495 30.8748H43.0288L43.1382 30.8856ZM48.8589 25.4686C49.1058 25.519 49.2914 25.7381 49.2915 25.9998C49.2915 26.2616 49.1058 26.4806 48.8589 26.5311L48.7495 26.5418H35.7495C35.4505 26.5417 35.2085 26.2989 35.2085 25.9998C35.2086 25.7008 35.4505 25.458 35.7495 25.4578H48.7495L48.8589 25.4686ZM48.8579 20.0526C49.1049 20.103 49.2905 20.322 49.2905 20.5838C49.2904 20.8455 49.1048 21.0647 48.8579 21.1151L48.7495 21.1248H35.7495C35.4505 21.1248 35.2077 20.8828 35.2075 20.5838C35.2075 20.2847 35.4504 20.0418 35.7495 20.0418H48.7495L48.8579 20.0526Z",
  p3b232580:
    "M31.8684 56.3336H28.4494V46.8306H31.7774C32.7134 46.8306 33.5367 47.0343 34.2474 47.4416C34.958 47.8403 35.5127 48.3993 35.9114 49.1186C36.3187 49.8293 36.5224 50.6569 36.5224 51.6016C36.5224 52.5289 36.323 53.3523 35.9244 54.0716C35.5344 54.7823 34.9884 55.3369 34.2864 55.7356C33.593 56.1343 32.787 56.3336 31.8684 56.3336ZM30.1134 47.5976V55.5796L29.3204 54.7996H31.7124C32.345 54.7996 32.891 54.6696 33.3504 54.4096C33.8097 54.1496 34.1607 53.7813 34.4034 53.3046C34.646 52.8279 34.7674 52.2603 34.7674 51.6016C34.7674 50.9256 34.6417 50.3493 34.3904 49.8726C34.139 49.3873 33.7794 49.0146 33.3114 48.7546C32.8434 48.4946 32.28 48.3646 31.6214 48.3646H29.3204L30.1134 47.5976Z",
  p218b2c0:
    "M46.7304 51.5756C46.7304 52.5376 46.5354 53.3913 46.1454 54.1366C45.7554 54.8733 45.2137 55.4496 44.5204 55.8656C43.8271 56.2816 43.0254 56.4896 42.1154 56.4896C41.2141 56.4896 40.4167 56.2816 39.7234 55.8656C39.0301 55.4496 38.4884 54.8733 38.0984 54.1366C37.7171 53.3999 37.5264 52.5506 37.5264 51.5886C37.5264 50.6179 37.7214 49.7643 38.1114 49.0276C38.5014 48.2823 39.0387 47.7016 39.7234 47.2856C40.4167 46.8696 41.2184 46.6616 42.1284 46.6616C43.0384 46.6616 43.8357 46.8696 44.5204 47.2856C45.2137 47.7016 45.7554 48.2779 46.1454 49.0146C46.5354 49.7513 46.7304 50.6049 46.7304 51.5756ZM44.9884 51.5756C44.9884 50.8996 44.8714 50.3146 44.6374 49.8206C44.4034 49.3266 44.0741 48.9453 43.6494 48.6766C43.2247 48.3993 42.7177 48.2606 42.1284 48.2606C41.5477 48.2606 41.0407 48.3993 40.6074 48.6766C40.1827 48.9453 39.8534 49.3266 39.6194 49.8206C39.3854 50.3146 39.2684 50.8996 39.2684 51.5756C39.2684 52.2516 39.3854 52.8409 39.6194 53.3436C39.8534 53.8376 40.1827 54.2189 40.6074 54.4876C41.0407 54.7563 41.5477 54.8906 42.1284 54.8906C42.7177 54.8906 43.2247 54.7563 43.6494 54.4876C44.0741 54.2103 44.4034 53.8246 44.6374 53.3306C44.8714 52.8279 44.9884 52.2429 44.9884 51.5756Z",
  pc21c400:
    "M52.3091 56.4896C51.3818 56.4896 50.5758 56.2903 49.8911 55.8916C49.2151 55.4843 48.6865 54.9166 48.3051 54.1886C47.9325 53.4519 47.7461 52.5853 47.7461 51.5886C47.7461 50.6006 47.9368 49.7383 48.3181 49.0016C48.7081 48.2649 49.2541 47.6929 49.9561 47.2856C50.6581 46.8783 51.4685 46.6746 52.3871 46.6746C53.1411 46.6746 53.8171 46.8133 54.4151 47.0906C55.0131 47.3679 55.5071 47.7579 55.8971 48.2606C56.2871 48.7546 56.5341 49.3439 56.6381 50.0286H54.8831C54.7185 49.4739 54.4108 49.0449 53.9601 48.7416C53.5181 48.4296 52.9765 48.2736 52.3351 48.2736C51.7631 48.2736 51.2605 48.4079 50.8271 48.6766C50.4025 48.9453 50.0731 49.3266 49.8391 49.8206C49.6051 50.3146 49.4881 50.9039 49.4881 51.5886C49.4881 52.2473 49.6051 52.8279 49.8391 53.3306C50.0731 53.8246 50.4025 54.2103 50.8271 54.4876C51.2605 54.7563 51.7631 54.8906 52.3351 54.8906C52.9851 54.8906 53.5398 54.7346 53.9991 54.4226C54.4671 54.1106 54.7791 53.6903 54.9351 53.1616H56.6641C56.5428 53.8203 56.2785 54.4009 55.8711 54.9036C55.4725 55.4063 54.9655 55.7963 54.3501 56.0736C53.7435 56.3509 53.0631 56.4896 52.3091 56.4896Z",
  p116e1b00:
    "M56.3333 15.1667C59.9232 15.1667 62.8333 18.0768 62.8333 21.6667V54.1667C62.8333 57.7565 59.9232 60.6667 56.3333 60.6667H28.1667C24.5768 60.6667 21.6667 57.7565 21.6667 54.1667V21.6667C21.6667 18.0768 24.5768 15.1667 28.1667 15.1667H56.3333Z",
  p387da200:
    "M43.1976 18.9583C44.0855 18.9584 44.6857 19.7557 44.6859 20.5824V22.7523C44.6858 23.2196 44.4936 23.6769 44.1663 23.9867L46.2035 27.6244H47.804L47.9671 27.6331C48.7647 27.7238 49.2921 28.4734 49.2923 29.2484V31.4193C49.2898 32.2446 48.69 33.0412 47.8021 33.0413H45.9046C45.0179 33.0411 44.4175 32.2433 44.4173 31.4173V30.348H40.0833V31.4173C40.0832 32.2439 39.4828 33.0411 38.5951 33.0413H36.6966C35.8089 33.0411 35.2085 32.2439 35.2083 31.4173V29.2484C35.2085 28.4218 35.8089 27.6246 36.6966 27.6244H38.2972L40.3324 23.9867C40.0045 23.6771 39.811 23.2199 39.8109 22.7523V20.5824C39.8111 19.7558 40.4124 18.9585 41.3001 18.9583H43.1976ZM36.6966 28.7074C36.5385 28.7076 36.2915 28.8798 36.2913 29.2484V31.4173C36.2915 31.786 36.5384 31.9581 36.6966 31.9583H38.5951C38.7532 31.958 39.0002 31.7859 39.0003 31.4173V29.2484C39.0002 28.9258 38.8108 28.7542 38.6576 28.7161L38.6253 28.7113C38.596 28.712 38.5668 28.7114 38.5374 28.7074H36.6966ZM45.9749 28.7074C45.9382 28.7132 45.9012 28.714 45.8646 28.7122C45.7083 28.7391 45.5015 28.9108 45.5013 29.2484V31.4173C45.5014 31.7866 45.7486 31.958 45.9046 31.9583H47.8021C47.96 31.9582 48.2075 31.7865 48.2093 31.4173V29.2484C48.2091 28.9256 48.0198 28.754 47.8665 28.7161L47.804 28.7074H45.9749ZM39.3968 27.8773C39.8246 28.1775 40.0832 28.7065 40.0833 29.2484V29.265H44.4173V29.2484C44.4175 28.7068 44.6764 28.1787 45.1038 27.8783L43.1439 24.3763H41.3577L39.3968 27.8773ZM41.3001 20.0413C41.142 20.0416 40.895 20.2137 40.8949 20.5824V22.7523C40.895 23.0255 41.0327 23.1912 41.1693 23.2581C41.2023 23.2646 41.2348 23.2745 41.2669 23.2874C41.2791 23.2892 41.2907 23.2923 41.3021 23.2923H43.1976C43.2093 23.2923 43.2212 23.2893 43.2337 23.2874C43.2645 23.275 43.2958 23.2656 43.3275 23.2591C43.4636 23.1935 43.6027 23.0288 43.6029 22.7523V20.5824C43.6027 20.2135 43.3557 20.0414 43.1976 20.0413H41.3001Z",
  pca44c30:
    "M32.3158 46.8298V56.3328H30.6518V46.8298H32.3158ZM34.4088 53.0568H31.9128V51.5748H34.0578C34.6298 51.5748 35.0631 51.4318 35.3578 51.1458C35.6611 50.8512 35.8128 50.4438 35.8128 49.9238C35.8128 49.4038 35.6611 49.0052 35.3578 48.7278C35.0631 48.4505 34.6384 48.3118 34.0838 48.3118H31.7568V46.8298H34.4088C35.0501 46.8298 35.6048 46.9598 36.0728 47.2198C36.5408 47.4798 36.9048 47.8438 37.1648 48.3118C37.4248 48.7712 37.5548 49.3128 37.5548 49.9368C37.5548 50.5435 37.4248 51.0852 37.1648 51.5618C36.9048 52.0298 36.5408 52.3982 36.0728 52.6668C35.6048 52.9268 35.0501 53.0568 34.4088 53.0568Z",
  p3b613780:
    "M42.3735 56.3328H38.9545V46.8298H42.2825C43.2185 46.8298 44.0418 47.0335 44.7525 47.4408C45.4632 47.8395 46.0178 48.3985 46.4165 49.1178C46.8238 49.8285 47.0275 50.6562 47.0275 51.6008C47.0275 52.5282 46.8282 53.3515 46.4295 54.0708C46.0395 54.7815 45.4935 55.3362 44.7915 55.7348C44.0982 56.1335 43.2922 56.3328 42.3735 56.3328ZM40.6185 47.5968V55.5788L39.8255 54.7988H42.2175C42.8502 54.7988 43.3962 54.6688 43.8555 54.4088C44.3148 54.1488 44.6658 53.7805 44.9085 53.3038C45.1512 52.8272 45.2725 52.2595 45.2725 51.6008C45.2725 50.9248 45.1468 50.3485 44.8955 49.8718C44.6442 49.3865 44.2845 49.0138 43.8165 48.7538C43.3485 48.4938 42.7852 48.3638 42.1265 48.3638H39.8255L40.6185 47.5968Z",
  p253c5300:
    "M50.2416 46.8298V56.3328H48.5776V46.8298H50.2416ZM54.4536 48.3638H48.7076V46.8298H54.4536V48.3638ZM53.7776 52.4458H48.6816V50.9508H53.7776V52.4458Z",
  p383fd400:
    "M42.7916 18.9686C43.0383 19.0192 43.2252 19.2381 43.2252 19.4999C43.2252 19.5104 43.2228 19.5207 43.2222 19.5311V24.3749H48.7584L48.858 24.3846C48.8897 24.3911 48.9203 24.4011 48.9498 24.4129C48.9668 24.4197 48.9825 24.429 48.9986 24.4374C49.0114 24.4441 49.0245 24.4502 49.0367 24.4579C49.0521 24.4676 49.0663 24.4789 49.0806 24.4901C49.092 24.499 49.1033 24.5077 49.1138 24.5174C49.1264 24.529 49.1385 24.5409 49.15 24.5536C49.1601 24.5648 49.1691 24.5767 49.1783 24.5887C49.1898 24.6038 49.2006 24.6193 49.2105 24.6356C49.2167 24.6458 49.2226 24.6562 49.2281 24.6669C49.2373 24.6844 49.2463 24.702 49.2535 24.7206C49.2592 24.7354 49.2627 24.751 49.2672 24.7665C49.2718 24.7826 49.2767 24.7986 49.2799 24.8153C49.286 24.8479 49.2906 24.8814 49.2906 24.9159V30.3329L49.2828 30.4286C49.2822 30.4316 49.2804 30.4344 49.2799 30.4374C49.2783 30.4454 49.2749 30.4529 49.273 30.4608C49.267 30.4855 49.2608 30.5098 49.2515 30.5331C49.2468 30.5449 49.2404 30.5558 49.2349 30.5672C49.2263 30.5851 49.2171 30.6023 49.2066 30.619C49.1995 30.6304 49.1921 30.6414 49.1842 30.6522C49.1718 30.6691 49.1583 30.6848 49.1441 30.7001C49.1359 30.7089 49.1275 30.7172 49.1187 30.7254C49.104 30.7393 49.089 30.7524 49.0728 30.7645C49.0625 30.7722 49.0524 30.78 49.0416 30.787C49.0232 30.7988 49.0038 30.8086 48.984 30.8182C48.9735 30.8233 48.9636 30.8294 48.9527 30.8338C48.9223 30.8462 48.8908 30.8574 48.858 30.8641C48.823 30.8712 48.7867 30.8748 48.7496 30.8749L42.69 30.8739C42.6869 30.8739 42.6834 30.8749 42.6802 30.8749C42.677 30.8749 42.6737 30.8739 42.6705 30.8739L35.7496 30.8749C35.488 30.8749 35.269 30.6889 35.2183 30.4422C35.2111 30.4069 35.2076 30.3703 35.2076 30.3329V24.9247C35.2075 24.9218 35.2066 24.9187 35.2066 24.9159C35.2066 24.9126 35.2075 24.9094 35.2076 24.9061V19.4999C35.2076 19.2007 35.4504 18.9579 35.7496 18.9579H42.6832L42.7916 18.9686ZM43.2222 29.7909H48.2076V25.4579H43.2222V29.7909ZM36.2906 29.7909H42.1392V25.4579H36.2906V29.7909ZM36.2906 20.0409V24.3749H42.1392V20.0409H36.2906Z",
  p2f416d80:
    "M42.2119 46.83V56.333H40.5479V46.83H42.2119ZM40.8339 56.333V54.799H46.1769V56.333H40.8339Z",
  p26538f00:
    "M46.667 49.482C46.667 48.9273 46.81 48.4376 47.096 48.013C47.382 47.5883 47.7763 47.259 48.279 47.025C48.7903 46.7823 49.3797 46.661 50.047 46.661C50.6883 46.661 51.243 46.7736 51.711 46.999C52.1876 47.2243 52.556 47.545 52.816 47.961C53.0847 48.377 53.2277 48.871 53.245 49.443H51.581C51.5637 49.0356 51.4163 48.7193 51.139 48.494C50.8616 48.26 50.489 48.143 50.021 48.143C49.5097 48.143 49.098 48.26 48.786 48.494C48.4826 48.7193 48.331 49.0313 48.331 49.43C48.331 49.768 48.422 50.0366 48.604 50.236C48.7946 50.4266 49.0893 50.5696 49.488 50.665L50.983 51.003C51.7977 51.1763 52.4043 51.4753 52.803 51.9C53.2016 52.316 53.401 52.8793 53.401 53.59C53.401 54.1706 53.258 54.682 52.972 55.124C52.686 55.566 52.2786 55.9083 51.75 56.151C51.23 56.385 50.619 56.502 49.917 56.502C49.2496 56.502 48.6646 56.3893 48.162 56.164C47.6593 55.93 47.265 55.605 46.979 55.189C46.7016 54.773 46.5543 54.2833 46.537 53.72H48.201C48.2097 54.1186 48.3656 54.435 48.669 54.669C48.981 54.8943 49.4013 55.007 49.93 55.007C50.4847 55.007 50.9223 54.8943 51.243 54.669C51.5723 54.435 51.737 54.1273 51.737 53.746C51.737 53.4166 51.6503 53.1566 51.477 52.966C51.3037 52.7666 51.022 52.628 50.632 52.55L49.124 52.212C48.318 52.0386 47.707 51.7266 47.291 51.276C46.875 50.8166 46.667 50.2186 46.667 49.482Z",
  pf0e500:
    "M34.0913 51.588L30.9323 46.83H32.9083L34.0653 48.546C34.256 48.8233 34.4336 49.1093 34.5983 49.404C34.7716 49.69 34.9493 49.9933 35.1313 50.314L37.3413 46.83H39.2783L36.1713 51.575L39.2913 56.333H37.3283L36.2623 54.76C36.0456 54.4393 35.8506 54.1273 35.6773 53.824C35.504 53.5206 35.3176 53.2 35.1183 52.862L32.8173 56.333H30.8673L34.0913 51.588Z",
  p39437f00:
    "M11.3749 4.37488C11.3749 3.89163 10.9831 3.49988 10.4999 3.49988C10.0166 3.49988 9.62488 3.89163 9.62488 4.37488V9.62488H4.37488C3.89163 9.62488 3.49988 10.0166 3.49988 10.4999C3.49988 10.9831 3.89163 11.3749 4.37488 11.3749H9.62488V16.6249C9.62488 17.1081 10.0166 17.4999 10.4999 17.4999C10.9831 17.4999 11.3749 17.1081 11.3749 16.6249V11.3749H16.6249C17.1081 11.3749 17.4999 10.9831 17.4999 10.4999C17.4999 10.0166 17.1081 9.62488 16.6249 9.62488H11.3749V4.37488Z",
};

function FileFormatIcons() {
  return (
    <div className="relative size-[52px]" data-name="File Format Icons">
      <div className="absolute inset-[-27.08%_-31.25%_-43.75%_-31.25%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 85 89"
        >
          <g id="File Format Icons">
            <g filter="url(#filter0_d_1_462)" id="bg">
              <path d={svgPaths.p1ce53700} fill="url(#paint0_linear_1_462)" />
            </g>
            <g id="icon" opacity="0.9">
              <path d={svgPaths.p29a4f00} fill="white" id="Union" />
            </g>
            <foreignObject
              height="49.8333"
              width="71.5"
              x="6.49983"
              y="26.0003"
            >
              <div
                style={{
                  backdropFilter: "blur(5.42px)",
                  clipPath: "url(#bgblur_0_1_462_clip_path)",
                  height: "100%",
                  width: "100%",
                }}
              />
            </foreignObject>
            <g
              data-figma-bg-blur-radius="10.8333"
              filter="url(#filter1_d_1_462)"
              id="glass"
            >
              <rect
                fill="black"
                fillOpacity="0.35"
                height="28.1667"
                rx="6.5"
                shapeRendering="crispEdges"
                width="49.8333"
                x="17.3332"
                y="36.8336"
              />
              <rect
                height="27.0833"
                rx="5.95833"
                shapeRendering="crispEdges"
                stroke="url(#paint1_linear_1_462)"
                strokeWidth="1.08333"
                width="48.75"
                x="17.8748"
                y="37.3753"
              />
            </g>
            <g filter="url(#filter2_d_1_462)" id="type">
              <path d={svgPaths.p3b232580} fill="#F8FAFC" />
              <path d={svgPaths.p218b2c0} fill="#F8FAFC" />
              <path d={svgPaths.pc21c400} fill="#F8FAFC" />
            </g>
          </g>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="88.8333"
              id="filter0_d_1_462"
              width="84.5"
              x="4.76837e-07"
              y="-3.57628e-07"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="6.5" />
              <feGaussianBlur stdDeviation="10.8333" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_462"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_462"
                mode="normal"
                result="shape"
              />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="49.8333"
              id="filter1_d_1_462"
              width="71.5"
              x="6.49983"
              y="26.0003"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="4.33333" />
              <feGaussianBlur stdDeviation="3.25" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_462"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_462"
                mode="normal"
                result="shape"
              />
            </filter>
            <clipPath
              id="bgblur_0_1_462_clip_path"
              transform="translate(-6.49983 -26.0003)"
            >
              <rect
                height="28.1667"
                rx="6.5"
                width="49.8333"
                x="17.3332"
                y="36.8336"
              />
            </clipPath>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="18.4947"
              id="filter2_d_1_462"
              width="36.8814"
              x="24.116"
              y="44.4949"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="2.16667" />
              <feGaussianBlur stdDeviation="2.16667" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_462"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_462"
                mode="normal"
                result="shape"
              />
            </filter>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_1_462"
              x1="42.25"
              x2="42.25"
              y1="15.1667"
              y2="60.6667"
            >
              <stop stopColor="#179BF6" />
              <stop offset="1" stopColor="#006FBB" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint1_linear_1_462"
              x1="42.2498"
              x2="42.2498"
              y1="36.8336"
              y2="65.0003"
            >
              <stop stopColor="white" stopOpacity="0.3" />
              <stop offset="1" stopColor="white" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div
      className="content-stretch flex gap-[10px] items-center relative shrink-0"
      data-name="Icon"
    >
      <div className="flex h-[calc(1px*((52*0.13917310535907745)+(52*0.9902680516242981)))] items-center justify-center relative shrink-0 w-[calc(1px*((52*0.13917310535907745)+(52*0.9902680516242981)))]">
        <div className="flex-none -rotate-20">
          <FileFormatIcons />
        </div>
      </div>
    </div>
  );
}

function FileFormatIcons1() {
  return (
    <div
      className="relative shrink-0 size-[52px]"
      data-name="File Format Icons"
    >
      <div className="absolute inset-[-27.08%_-31.25%_-43.75%_-31.25%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 85 89"
        >
          <g id="File Format Icons">
            <g filter="url(#filter0_d_1_449)" id="bg">
              <path d={svgPaths.p116e1b00} fill="url(#paint0_linear_1_449)" />
            </g>
            <g id="icon" opacity="0.9">
              <path d={svgPaths.p387da200} fill="white" id="Union" />
            </g>
            <foreignObject height="49.8333" width="71.5" x="6.5" y="26">
              <div
                style={{
                  backdropFilter: "blur(5.42px)",
                  clipPath: "url(#bgblur_0_1_449_clip_path)",
                  height: "100%",
                  width: "100%",
                }}
              />
            </foreignObject>
            <g
              data-figma-bg-blur-radius="10.8333"
              filter="url(#filter1_d_1_449)"
              id="glass"
            >
              <rect
                fill="black"
                fillOpacity="0.35"
                height="28.1667"
                rx="6.5"
                shapeRendering="crispEdges"
                width="49.8333"
                x="17.3333"
                y="36.8333"
              />
              <rect
                height="27.0833"
                rx="5.95833"
                shapeRendering="crispEdges"
                stroke="url(#paint1_linear_1_449)"
                strokeWidth="1.08333"
                width="48.75"
                x="17.875"
                y="37.375"
              />
            </g>
            <g filter="url(#filter2_d_1_449)" id="type">
              <path d={svgPaths.pca44c30} fill="#F8FAFC" />
              <path d={svgPaths.p3b613780} fill="#F8FAFC" />
              <path d={svgPaths.p253c5300} fill="#F8FAFC" />
            </g>
          </g>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="88.8333"
              id="filter0_d_1_449"
              width="84.5"
              x="-9.53674e-07"
              y="3.57628e-07"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="6.5" />
              <feGaussianBlur stdDeviation="10.8333" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_449"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_449"
                mode="normal"
                result="shape"
              />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="49.8333"
              id="filter1_d_1_449"
              width="71.5"
              x="6.5"
              y="26"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="4.33333" />
              <feGaussianBlur stdDeviation="3.25" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_449"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_449"
                mode="normal"
                result="shape"
              />
            </filter>
            <clipPath
              id="bgblur_0_1_449_clip_path"
              transform="translate(-6.5 -26)"
            >
              <rect
                height="28.1667"
                rx="6.5"
                width="49.8333"
                x="17.3333"
                y="36.8333"
              />
            </clipPath>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="18.1697"
              id="filter2_d_1_449"
              width="32.4684"
              x="26.3184"
              y="44.6632"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="2.16667" />
              <feGaussianBlur stdDeviation="2.16667" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_449"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_449"
                mode="normal"
                result="shape"
              />
            </filter>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_1_449"
              x1="42.25"
              x2="42.25"
              y1="15.1667"
              y2="60.6667"
            >
              <stop stopColor="#F14B54" />
              <stop offset="1" stopColor="#88252B" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint1_linear_1_449"
              x1="42.25"
              x2="42.25"
              y1="36.8333"
              y2="65"
            >
              <stop stopColor="white" stopOpacity="0.3" />
              <stop offset="1" stopColor="white" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div
      className="content-stretch flex gap-[10px] items-center relative shrink-0"
      data-name="Icon"
    >
      <FileFormatIcons1 />
    </div>
  );
}

function FileFormatIcons2() {
  return (
    <div className="relative size-[52px]" data-name="File Format Icons">
      <div className="absolute inset-[-27.08%_-31.25%_-43.75%_-31.25%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 85 89"
        >
          <g id="File Format Icons">
            <g filter="url(#filter0_d_1_434)" id="bg">
              <path d={svgPaths.p1ce53700} fill="url(#paint0_linear_1_434)" />
            </g>
            <g id="icon" opacity="0.9">
              <path d={svgPaths.p383fd400} fill="white" id="Union" />
            </g>
            <foreignObject
              height="49.8333"
              width="71.5"
              x="6.49928"
              y="25.9994"
            >
              <div
                style={{
                  backdropFilter: "blur(5.42px)",
                  clipPath: "url(#bgblur_0_1_434_clip_path)",
                  height: "100%",
                  width: "100%",
                }}
              />
            </foreignObject>
            <g
              data-figma-bg-blur-radius="10.8333"
              filter="url(#filter1_d_1_434)"
              id="glass"
            >
              <rect
                fill="black"
                fillOpacity="0.35"
                height="28.1667"
                rx="6.5"
                shapeRendering="crispEdges"
                width="49.8333"
                x="17.3326"
                y="36.8328"
              />
              <rect
                height="27.0833"
                rx="5.95833"
                shapeRendering="crispEdges"
                stroke="url(#paint1_linear_1_434)"
                strokeWidth="1.08333"
                width="48.75"
                x="17.8743"
                y="37.3744"
              />
            </g>
            <g filter="url(#filter2_d_1_434)" id="type">
              <path d={svgPaths.pf0e500} fill="#F8FAFC" />
              <path d={svgPaths.p2f416d80} fill="#F8FAFC" />
              <path d={svgPaths.p26538f00} fill="#F8FAFC" />
            </g>
          </g>
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="88.8333"
              id="filter0_d_1_434"
              width="84.5"
              x="-9.53674e-07"
              y="2.38419e-07"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="6.5" />
              <feGaussianBlur stdDeviation="10.8333" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_434"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_434"
                mode="normal"
                result="shape"
              />
            </filter>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="49.8333"
              id="filter1_d_1_434"
              width="71.5"
              x="6.49928"
              y="25.9994"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="4.33333" />
              <feGaussianBlur stdDeviation="3.25" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_434"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_434"
                mode="normal"
                result="shape"
              />
            </filter>
            <clipPath
              id="bgblur_0_1_434_clip_path"
              transform="translate(-6.49928 -25.9994)"
            >
              <rect
                height="28.1667"
                rx="6.5"
                width="49.8333"
                x="17.3326"
                y="36.8328"
              />
            </clipPath>
            <filter
              colorInterpolationFilters="sRGB"
              filterUnits="userSpaceOnUse"
              height="18.5077"
              id="filter2_d_1_434"
              width="31.2003"
              x="26.534"
              y="44.4943"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                result="hardAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              />
              <feOffset dy="2.16667" />
              <feGaussianBlur stdDeviation="2.16667" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
              />
              <feBlend
                in2="BackgroundImageFix"
                mode="normal"
                result="effect1_dropShadow_1_434"
              />
              <feBlend
                in="SourceGraphic"
                in2="effect1_dropShadow_1_434"
                mode="normal"
                result="shape"
              />
            </filter>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_1_434"
              x1="42.25"
              x2="42.25"
              y1="15.1667"
              y2="60.6667"
            >
              <stop stopColor="#00C23E" />
              <stop offset="1" stopColor="#007B27" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint1_linear_1_434"
              x1="42.2493"
              x2="42.2493"
              y1="36.8328"
              y2="64.9994"
            >
              <stop stopColor="white" stopOpacity="0.3" />
              <stop offset="1" stopColor="white" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div
      className="content-stretch flex gap-[10px] items-center relative shrink-0"
      data-name="Icon"
    >
      <div className="flex h-[calc(1px*((52*0.13917310535907745)+(52*0.9902680516242981)))] items-center justify-center relative shrink-0 w-[calc(1px*((52*0.13917310535907745)+(52*0.9902680516242981)))]">
        <div className="flex-none rotate-20">
          <FileFormatIcons2 />
        </div>
      </div>
    </div>
  );
}

function IconGroup() {
  return (
    <div
      className="absolute content-stretch flex items-start justify-center left-[calc(50%+0.45px)] opacity-80 top-[-7px] translate-x-[-50%]"
      data-name="Icon Group"
    >
      <Icon />
      <Icon1 />
      <Icon2 />
    </div>
  );
}

function Icons24X24Plus() {
  return (
    <div
      className="relative shrink-0 size-[21px]"
      data-name="Icons 24x24 / plus"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 21 21"
      >
        <g id="Icons 24x24 / plus">
          <path
            clipRule="evenodd"
            d={svgPaths.p39437f00}
            fill="white"
            fillRule="evenodd"
            id="Union"
          />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div
      className="absolute bg-slate-950 box-border content-stretch flex gap-[8px] items-center justify-center left-1/2 p-[10px] rounded-[99px] shadow-[0px_-4px_6px_-1px_rgba(0,0,0,0.2),0px_-2px_4px_-2px_rgba(0,0,0,0.2)] size-[40px] top-[24.75px] translate-x-[-50%]"
      data-name="Button"
    >
      <Icons24X24Plus />
    </div>
  );
}

export function UploadGraphic() {
  return (
    <div
      className="h-[60.5px] relative shrink-0 w-[98.716px]"
      data-name="Upload Graphic"
    >
      <IconGroup />
      <Button />
    </div>
  );
}
