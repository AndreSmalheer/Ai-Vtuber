import "./Onboarding.css";
import { useEffect, useState, useRef } from "react";

const ArrowIcon = ({ size = 47 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 47 47"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.2812 22.0312H39.6562C40.0458 22.0312 40.4194 22.186 40.6948 22.4614C40.9703 22.7369 41.125 23.1105 41.125 23.5C41.125 23.8895 40.9703 24.2631 40.6948 24.5386C40.4194 24.814 40.0458 24.9688 39.6562 24.9688H10.2812C9.89171 24.9688 9.51813 24.814 9.24269 24.5386C8.96724 24.2631 8.8125 23.8895 8.8125 23.5C8.8125 23.1105 8.96724 22.7369 9.24269 22.4614C9.51813 22.186 9.89171 22.0312 10.2812 22.0312Z"
        fill="currentColor"
      />
      <path
        d="M10.8895 23.5L23.0713 35.6789C23.3471 35.9547 23.502 36.3287 23.502 36.7188C23.502 37.1088 23.3471 37.4828 23.0713 37.7586C22.7955 38.0344 22.4215 38.1894 22.0314 38.1894C21.6414 38.1894 21.2673 38.0344 20.9916 37.7586L7.77281 24.5399C7.63603 24.4034 7.52751 24.2414 7.45347 24.0629C7.37942 23.8845 7.34131 23.6932 7.34131 23.5C7.34131 23.3068 7.37942 23.1155 7.45347 22.9371C7.52751 22.7586 7.63603 22.5966 7.77281 22.4601L20.9916 9.24138C21.2673 8.96558 21.6414 8.81065 22.0314 8.81065C22.4215 8.81065 22.7955 8.96558 23.0713 9.24138C23.3471 9.51717 23.502 9.89122 23.502 10.2813C23.502 10.6713 23.3471 11.0453 23.0713 11.3211L10.8895 23.5Z"
        fill="currentColor"
      />
    </svg>
  );
};

const Live3d = ({ size = 42, color = "currentColor" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color }}
    >
      <path
        d="M21 17.9039L5.39866 12.2911M21 17.9039L36.6062 12.3096M21 17.9039V36.5384M8.98622 32.5099L19.1363 36.0924C19.827 36.3361 20.1722 36.4579 20.5264 36.5064C20.8407 36.5493 21.1593 36.5493 21.4736 36.5064C21.8278 36.4579 22.173 36.3361 22.8637 36.0924L33.0137 32.5099C34.359 32.0352 35.0315 31.7979 35.5281 31.3721C35.9665 30.9962 36.3053 30.5176 36.5139 29.9789C36.75 29.369 36.75 28.6557 36.75 27.2291V14.771C36.75 13.3445 36.75 12.6312 36.5139 12.0214C36.3053 11.4827 35.9665 11.0041 35.5281 10.6281C35.0315 10.2024 34.359 9.96505 33.0137 9.49027L22.8637 5.90792C22.173 5.66414 21.8278 5.54225 21.4736 5.49388C21.1593 5.45097 20.8407 5.45097 20.5264 5.49388C20.1722 5.54225 19.827 5.66414 19.1363 5.90792L8.98622 9.49027C7.64101 9.96505 6.96841 10.2024 6.47192 10.6281C6.03341 11.0041 5.69474 11.4827 5.48616 12.0214C5.25 12.6312 5.25 13.3445 5.25 14.771V27.2291C5.25 28.6557 5.25 29.369 5.48616 29.9789C5.69474 30.5176 6.03341 30.9962 6.47192 31.3721C6.96841 31.7979 7.64101 32.0352 8.98622 32.5099Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Ollama = ({ size = 33 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 33 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.8696 1.49873C11.1666 1.61565 11.4347 1.8081 11.6781 2.0625C12.0837 2.48325 12.4261 3.0855 12.6874 3.79913C12.95 4.51688 13.1205 5.31165 13.1851 6.10913C14.0508 5.61937 15.0116 5.32115 16.0025 5.23463L16.0726 5.22915C17.2688 5.13285 18.4514 5.34877 19.4826 5.8809C19.6215 5.95395 19.7577 6.03191 19.891 6.1146C19.9598 5.33227 20.1275 4.55535 20.386 3.8541C20.6472 3.13913 20.9896 2.53823 21.3938 2.11613C21.6198 1.87173 21.8961 1.67936 22.2038 1.55235C22.5571 1.41488 22.9325 1.39013 23.2982 1.4946C23.8496 1.65135 24.3226 2.00063 24.6953 2.508C25.0362 2.97142 25.292 3.56535 25.4666 4.27763C25.7828 5.56185 25.8379 7.25175 25.6247 9.2895L25.6976 9.34448L25.7333 9.37065C26.7743 10.1626 27.4988 11.2915 27.8825 12.6019C28.4806 14.6465 28.1795 16.94 27.1482 18.2229L27.1235 18.2518L27.1262 18.2559C27.6996 19.3036 28.0475 20.4105 28.1217 21.5559L28.1245 21.5971C28.2125 23.0615 27.8495 24.5355 27.0053 25.9834L26.9956 25.9971L27.0094 26.0301C27.6584 27.621 27.8618 29.2229 27.6116 30.8234L27.6034 30.877C27.5646 31.1108 27.4347 31.3196 27.2422 31.4578C27.0496 31.596 26.8102 31.6521 26.5763 31.614C26.4018 31.5867 26.2394 31.5083 26.1097 31.3886C25.9799 31.2689 25.8886 31.1134 25.8473 30.9418C25.8199 30.8278 25.8153 30.7095 25.8338 30.5938C26.0633 29.1734 25.8475 27.7489 25.1738 26.2996C25.1109 26.165 25.0829 26.0167 25.0925 25.8684C25.1021 25.7201 25.149 25.5766 25.2287 25.4513L25.2342 25.443C26.0648 24.1725 26.4085 22.9268 26.3342 21.703C26.271 20.6319 25.8874 19.58 25.2342 18.5776C25.1071 18.3828 25.0619 18.1457 25.1082 17.9178C25.1545 17.6898 25.2887 17.4892 25.4817 17.3594L25.4941 17.3511C25.8282 17.1325 26.1362 16.5743 26.2916 15.8111C26.4631 14.9088 26.4183 13.9786 26.161 13.0969C25.8791 12.1344 25.3635 11.3314 24.6416 10.7828C23.8235 10.1585 22.74 9.8574 21.3691 9.94402C21.1898 9.95568 21.0112 9.91329 20.8563 9.82234C20.7014 9.7314 20.5773 9.59608 20.5001 9.43388C20.0684 8.51948 19.4386 7.86502 18.6535 7.45935C17.8997 7.08317 17.0558 6.92507 16.217 7.0029C14.5051 7.13902 12.9953 8.10427 12.5457 9.32115C12.4821 9.4924 12.3677 9.64013 12.2178 9.74456C12.0679 9.84899 11.8897 9.90513 11.707 9.90548C10.2398 9.90825 9.10411 10.252 8.27363 10.8721C7.55588 11.4084 7.06636 12.1577 6.80784 13.0556C6.57393 13.9008 6.54192 14.7891 6.71438 15.6489C6.86836 16.4161 7.16949 17.0514 7.51463 17.3938L7.52559 17.4034C7.81711 17.688 7.87899 18.1321 7.67551 18.4828C7.18051 19.338 6.81061 20.6126 6.75009 21.8378C6.68138 23.2375 7.00584 24.453 7.73874 25.3247L7.76071 25.3509C7.87136 25.4798 7.94253 25.6378 7.9657 25.806C7.98887 25.9743 7.96306 26.1457 7.89136 26.2996C7.09936 27.9991 6.85599 29.3961 7.11863 30.4961C7.16537 30.7247 7.12118 30.9625 6.99544 31.159C6.8697 31.3555 6.67233 31.4952 6.44522 31.5485C6.21811 31.6019 5.97915 31.5646 5.7791 31.4446C5.57904 31.3246 5.43364 31.1313 5.37376 30.9059C5.03963 29.5061 5.26651 27.9029 6.02409 26.0961L6.04336 26.048L6.0324 26.0315C5.66003 25.4815 5.38211 24.8732 5.21011 24.2316L5.20321 24.2055C4.99451 23.4051 4.91239 22.5769 4.95984 21.7511C5.02036 20.4999 5.34211 19.2184 5.81513 18.1899L5.83163 18.1541L5.82886 18.1514C5.42603 17.5766 5.12761 16.841 4.96261 16.027L4.95572 15.994C4.72838 14.8586 4.77219 13.6855 5.08359 12.5702C5.44388 11.3121 6.15197 10.2314 7.19559 9.45038C7.27809 9.3885 7.36472 9.32663 7.45134 9.26888C7.23272 7.21598 7.28776 5.51513 7.60538 4.22265C7.77999 3.51038 8.03709 2.91638 8.37811 2.45302C8.74936 1.947 9.22238 1.59773 9.77371 1.43963C10.1395 1.33515 10.5162 1.35848 10.8696 1.49738V1.49873ZM16.5291 13.9975C17.8161 13.9975 19.0041 14.4279 19.8923 15.1731C20.7586 15.8978 21.2742 16.8713 21.2742 17.8406C21.2742 19.0616 20.716 20.0131 19.7164 20.6209C18.8639 21.1365 17.7212 21.3868 16.4123 21.3868C15.0248 21.3868 13.8396 21.0306 12.9844 20.3775C12.136 19.7312 11.6603 18.8237 11.6603 17.8406C11.6603 16.8685 12.2075 15.8923 13.1123 15.1649C14.0307 14.4265 15.2435 13.9975 16.5291 13.9975ZM16.5291 15.2295C15.5752 15.2212 14.6466 15.5362 13.8946 16.1233C13.2608 16.632 12.9019 17.2714 12.9019 17.842C12.9019 18.4305 13.1906 18.9819 13.7406 19.4012C14.3663 19.8784 15.2861 20.1548 16.4123 20.1548C17.5109 20.1548 18.4376 19.9526 19.0688 19.569C19.7054 19.184 20.0312 18.6257 20.0312 17.8406C20.0312 17.259 19.693 16.6169 19.0921 16.1136C18.4266 15.5567 17.5246 15.2295 16.5291 15.2295ZM17.4394 16.8932L17.4449 16.8988C17.4841 16.948 17.5133 17.0046 17.5306 17.0651C17.548 17.1257 17.5533 17.189 17.5461 17.2516C17.539 17.3142 17.5195 17.3748 17.4889 17.4298C17.4583 17.4849 17.4172 17.5334 17.3678 17.5725L16.9664 17.8888V18.502C16.9657 18.6385 16.9108 18.7692 16.8139 18.8653C16.717 18.9615 16.5859 19.0153 16.4494 19.0149C16.3129 19.0152 16.1818 18.9614 16.0849 18.8653C15.988 18.7691 15.9331 18.6385 15.9323 18.502V17.8695L15.5597 17.5697C15.5106 17.5304 15.4697 17.4816 15.4395 17.4264C15.4092 17.3711 15.3902 17.3104 15.3836 17.2478C15.3769 17.1851 15.3828 17.1218 15.4007 17.0614C15.4187 17.001 15.4484 16.9448 15.4883 16.896C15.5694 16.7972 15.6863 16.7344 15.8134 16.7213C15.9406 16.7082 16.0678 16.7457 16.1675 16.8259L16.4631 17.0624L16.7656 16.8231C16.8649 16.7447 16.9909 16.7081 17.1167 16.7212C17.2426 16.7343 17.3584 16.7961 17.4394 16.8932ZM10.5094 14.2546C11.1666 14.2546 11.7015 14.7909 11.7015 15.4523C11.7018 15.7693 11.5763 16.0734 11.3525 16.298C11.1287 16.5225 10.825 16.6491 10.508 16.6499C10.1914 16.6488 9.88819 16.5223 9.66474 16.298C9.44128 16.0738 9.31582 15.7702 9.31584 15.4536C9.31515 15.1366 9.44031 14.8322 9.66382 14.6074C9.88789 14.3826 10.192 14.2557 10.5094 14.2546ZM22.4801 14.2546C23.1401 14.2546 23.6736 14.7909 23.6736 15.4523C23.674 15.7693 23.5485 16.0735 23.3247 16.298C23.1009 16.5226 22.7972 16.6491 22.4801 16.6499C22.1636 16.6488 21.8604 16.5222 21.6369 16.298C21.4135 16.0738 21.288 15.7702 21.288 15.4536C21.2873 15.1366 21.4124 14.8322 21.636 14.6074C21.8595 14.3826 22.1631 14.2557 22.4801 14.2546ZM10.2302 3.16252L10.2261 3.16523C10.0668 3.23451 9.93079 3.34812 9.83424 3.49252L9.82734 3.50077C9.63759 3.76065 9.47259 4.14285 9.34884 4.64475C9.11513 5.59627 9.05184 6.8874 9.17836 8.46998C9.76959 8.29402 10.4145 8.184 11.1089 8.1441L11.1226 8.14275L11.1488 8.09602C11.2118 7.98359 11.2797 7.87394 11.3522 7.76738C11.5214 6.70725 11.3825 5.44088 11.0044 4.40685C10.8201 3.90638 10.596 3.51315 10.3815 3.28898C10.3372 3.24238 10.2879 3.20088 10.2344 3.16523L10.2302 3.16252ZM22.8445 3.2175L22.8417 3.21885C22.7882 3.2545 22.7389 3.29601 22.6946 3.3426C22.4801 3.56677 22.2546 3.96135 22.0718 4.4619C21.673 5.5536 21.5396 6.9039 21.7555 7.99838L21.8352 8.13173L21.8462 8.151H21.8875C22.5699 8.15119 23.2488 8.24936 23.9033 8.44252C24.0215 6.897 23.9555 5.6334 23.7272 4.69973C23.6035 4.1979 23.4385 3.81563 23.2474 3.55575L23.2418 3.5475C23.1455 3.40258 23.0094 3.28849 22.85 3.21885H22.8445V3.2175Z"
        fill="currentColor"
      />
    </svg>
  );
};

const Piper = ({ size = 33 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 733 733"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M439.51 248.968C479.682 252.393 511.438 263.856 534.776 283.356C563.274 306.824 577.523 340.352 577.523 383.937C577.523 427.709 563.274 461.422 534.776 485.077C506.464 508.546 465.766 520.281 412.681 520.281H341.715V665.007H234.149V372.238C301.156 325.005 369.206 282.199 439.51 248.968ZM341.715 325.823V442.33H401.226C422.088 442.33 438.199 437.301 449.561 427.243C460.923 416.998 466.604 402.563 466.604 383.937C466.604 365.311 460.923 350.969 449.561 340.91C438.199 330.852 422.088 325.823 401.226 325.823H341.715Z"
        fill="currentColor"
      />

      <path
        d="M410.845 237.833C353.467 167.006 363.997 117.968 397.987 77.3865C360.314 77.1448 316.068 75.2653 285.574 159.896C212.621 161.313 207.277 104.849 206.37 50.4277C173.564 102.772 155.569 139.171 179.972 215.357C93.1197 190.913 81.7403 257.973 45.8271 291.652C115.671 255.368 202.134 241.39 231.83 346.226C281.244 310.442 334.72 274.639 411.257 238.725C411.563 238.584 411.058 238.094 410.845 237.833Z"
        fill="currentColor"
      />

      <path
        d="M50.7704 305.788C59.319 305.788 66.2489 298.858 66.2489 290.31C66.2489 281.761 59.319 274.831 50.7704 274.831C42.2219 274.831 35.292 281.761 35.292 290.31C35.292 298.858 42.2219 305.788 50.7704 305.788Z"
        fill="currentColor"
      />

      <path
        d="M204.847 66.2485C213.395 66.2485 220.325 59.3186 220.325 50.7701C220.325 42.2216 213.395 35.2916 204.847 35.2916C196.298 35.2916 189.368 42.2216 189.368 50.7701C189.368 59.3186 196.298 66.2485 204.847 66.2485Z"
        fill="currentColor"
      />

      <path
        d="M389.714 94.4317C398.262 94.4317 405.192 87.5017 405.192 78.9532C405.192 70.4047 398.262 63.4747 389.714 63.4747C381.165 63.4747 374.235 70.4047 374.235 78.9532C374.235 87.5017 381.165 94.4317 389.714 94.4317Z"
        fill="currentColor"
      />
    </svg>
  );
};

const SpeakerIcon = ({ size = 33 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 33 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.4121 1.9422V31.0604H16.0985L8.33362 23.2955H2.91182C1.30642 23.2955 0 21.9891 0 20.3837V12.6189C0 11.0135 1.30642 9.70705 2.91182 9.70705H8.33362L16.0985 1.9422H19.4121ZM17.4709 3.88341H16.9021L9.70606 11.0795V21.9231L16.9021 29.1191H17.4709V3.88342V3.88341ZM28.7371 6.20568C31.4859 8.95637 33 12.6117 33 16.5019C33 20.3901 31.4859 24.0454 28.7371 26.7961L27.3647 25.4237C29.7485 23.0399 31.0588 19.8718 31.0588 16.5019C31.0588 13.13 29.7485 9.96192 27.3647 7.57812L28.7371 6.20568ZM24.6274 10.3263C26.2716 11.9938 27.1762 14.1874 27.1762 16.5013C27.1762 18.8152 26.2716 21.0088 24.6274 22.6763L23.2433 21.3135C24.5284 20.011 25.235 18.3027 25.235 16.5013C25.235 14.6998 24.5284 12.9916 23.2433 11.689L24.6274 10.3263ZM7.76485 11.6483H2.91182C2.37798 11.6483 1.94121 12.0831 1.94121 12.6189V20.3837C1.94121 20.9195 2.37798 21.3543 2.91182 21.3543H7.76485V11.6483Z"
        fill="currentColor"
      />
    </svg>
  );
};

function Welcome({ currentStep, setCurrentStep, setIsFirstVisit }) {
  return (
    <>
      <div className="onboarding-shell">
        <div className="onboarding-container">
          <h1 className="onboarding-title">Meet Mia</h1>

          <div class="onboarding-img-wrapper">
            <img
              class="onboarding-img-big"
              src="/onboarding/welcome-onboarding-img.png"
            />
          </div>

          <h2 className="onboarding-sub-title">
            your personal AI<br></br> companion.
          </h2>

          <div className="bottom-container">
            <div class="onboarding-dots-container">
              <div class="onboarding-dot active"></div>
              <div class="onboarding-dot"></div>
              <div class="onboarding-dot"></div>
            </div>

            <button
              className="get-started-btn"
              onClick={() => setCurrentStep((prev) => prev + 1)}
            >
              Get Started
            </button>

            <button className="skip-btn" onClick={() => setIsFirstVisit(false)}>
              Skip intro
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Features({ setCurrentStep, setIsFirstVisit }) {
  return (
    <>
      <div className="onboarding-shell">
        <div className="onboarding-container">
          <h1 className="onboarding-title">More Than Just Chat</h1>

          <div class="onboarding-img-wrapper">
            <img
              class="onboarding-img-small"
              src="/onboarding/features-onboarding-img.png"
            />
          </div>

          <div className="features-container">
            <div className="feature">
              <div className="feature-icon">
                <Live3d />
              </div>
              <div className="feature-content">
                <h1 className="feature-title">Live 3D character</h1>
                <h2 className="feature-description">
                  A VRM model rendered in Three.js orbit, zoom, and interact
                  with Mia in 3D.
                </h2>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <SpeakerIcon />
              </div>
              <div className="feature-content">
                <h1 className="feature-title">Voice with Piper TTS</h1>
                <h2 className="feature-description">
                  Mia actually speaks to you natural, expressive text-to-speech
                  built in
                </h2>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <Ollama />
              </div>
              <div className="feature-content">
                <h1 className="feature-title">Ollama LLM brain</h1>
                <h2 className="feature-description">
                  Powered locally by Ollama fast, private, and fully on your
                  machine.
                </h2>
              </div>
            </div>
          </div>

          <div className="bottom-container">
            <div class="onboarding-dots-container">
              <div class="onboarding-dot"></div>
              <div class="onboarding-dot active"></div>
              <div class="onboarding-dot"></div>
            </div>

            <div className="onboarding-nav-buttons">
              <button
                className="back-btn"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                <ArrowIcon />
              </button>

              <button
                className="next-btn"
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Customize({ currentStep, setCurrentStep, setIsFirstVisit }) {
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);
  const [isRefreshingPiper, setIsRefreshingPiper] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isPiperConnected, setIsPiperConnected] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [piperUrl, setPiperUrl] = useState("");
  const [canFinishOnboarding, setCanFinishOnboarding] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [piperStatus, setPiperStatus] = useState(null);

  const loadedRef = useRef(false);

  const [config, setConfig] = useState();

  const [darkMode, setDarkMode] = useState(
    document.body.classList.contains("dark"),
  );

  useEffect(() => {
    async function loadConfig() {
      if (loadedRef.current) return;
      loadedRef.current = true;

      const res = await fetch("http://localhost:8000/api/config");
      const data = await res.json();

      setConfig(data);
      setOllamaUrl(data.ollama_url);
      setPiperUrl(data.piper_url);
    }

    loadConfig();
  }, []);

  async function updateConfig(settings) {
    const updatedConfig = {
      ...config,
      ...settings,
    };

    setConfig(updatedConfig);

    try {
      await fetch("http://localhost:8000/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedConfig),
      });
    } catch (err) {
      console.error("Failed to update config:", err);
    }
  }

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    updateConfig({ is_dark: darkMode });
  }, [darkMode, config?.is_dark]);

  useEffect(() => {
    setCanFinishOnboarding(isOllamaConnected && isPiperConnected);
  }, [isOllamaConnected, isPiperConnected]);

  async function checkOllamaConnection(url) {
    setIsRefreshingOllama(true);
    setOllamaStatus(null);

    try {
      const response = await fetch(`${url}/api/tags`);

      if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}`);
      }

      updateConfig({ ollama_url: url });

      setOllamaStatus("success");
      setIsOllamaConnected(true);
    } catch (error) {
      console.error("Ollama connection failed:", error);
      setOllamaStatus("error");
      setIsOllamaConnected(false);
    } finally {
      setIsRefreshingOllama(false);
    }
  }

  async function checkPiperConnection(url) {
    setIsRefreshingPiper(true);
    setPiperStatus(null);

    try {
      const response = await fetch(`${url}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "ping",
        }),
      });

      if (!response.ok) {
        throw new Error(`Piper responded with ${response.status}`);
      }

      updateConfig({ piper_url: url });
      setPiperStatus("success");
      setIsPiperConnected(true);
    } catch (error) {
      console.error("Piper connection failed:", error);
      setPiperStatus("error");
      setIsPiperConnected(false);
    } finally {
      setIsRefreshingPiper(false);
    }
  }

  return (
    <>
      <div className="onboarding-shell">
        <div className="onboarding-container">
          <h1 className="onboarding-title">Customize your way.</h1>

          <div class="onboarding-img-wrapper">
            <img
              class="onboarding-img-small"
              src="/onboarding/features-onboarding-img.png"
            />
          </div>

          <div className="features-container">
            <div className="feature">
              <div className="feature-icon">
                <Ollama />
              </div>

              <div className="feature-content">
                <h1 className="feature-title">Ollama</h1>

                <div className="ollama-input-group">
                  <input
                    className="feature-input"
                    type="text"
                    placeholder="Ollama url"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                  />

                  <button
                    type="button"
                    className={`refresh-btn
                    ${isRefreshingOllama ? "spinning" : ""}
                    ${ollamaStatus === "success" ? "success" : ""}
                    ${ollamaStatus === "error" ? "error" : ""}`}
                    onClick={() => checkOllamaConnection(ollamaUrl)}
                  ></button>
                </div>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <Piper />
              </div>

              <div className="feature-content">
                <h1 className="feature-title">Piper tts</h1>

                <div className="ollama-input-group">
                  <input
                    className="feature-input"
                    type="text"
                    placeholder="Piper url"
                    value={piperUrl}
                    onChange={(e) => setPiperUrl(e.target.value)}
                  />

                  <button
                    type="button"
                    className={`refresh-btn
                    ${isRefreshingPiper ? "spinning" : ""}
                    ${piperStatus === "success" ? "success" : ""}
                    ${piperStatus === "error" ? "error" : ""}`}
                    onClick={() => checkPiperConnection(piperUrl)}
                  ></button>
                </div>
              </div>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <Live3d />
              </div>

              <div className="feature-content">
                <h1 className="feature-title">Dark Mode</h1>

                <h2 className="feature-description">
                  Easy on the eyes at night
                </h2>
              </div>

              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="bottom-container">
            <div class="onboarding-dots-container">
              <div class="onboarding-dot"></div>
              <div class="onboarding-dot"></div>
              <div class="onboarding-dot active"></div>
            </div>

            <div className="onboarding-nav-buttons">
              <button
                className="back-btn"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                <ArrowIcon />
              </button>

              <button
                className={`next-btn ${!canFinishOnboarding ? "inactive" : ""}`}
                onClick={() => canFinishOnboarding && setIsFirstVisit(false)}
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Onboarding({ setIsFirstVisit }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <>
      {currentStep === 0 && (
        <Welcome
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          setIsFirstVisit={setIsFirstVisit}
        />
      )}

      {currentStep === 1 && (
        <Features
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          setIsFirstVisit={setIsFirstVisit}
        />
      )}

      {currentStep === 2 && (
        <Customize
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          setIsFirstVisit={setIsFirstVisit}
        />
      )}
    </>
  );
}

export default Onboarding;
