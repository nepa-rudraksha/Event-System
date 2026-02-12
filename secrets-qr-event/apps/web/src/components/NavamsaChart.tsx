import React, { useEffect, useRef, useState } from "react";

interface NavamsaPlanet {
  abbreviation: string;
  sidereal_sign_num: number;
}

interface NavamsaHouse {
  house: string;
  planets: NavamsaPlanet[];
  sidereal_sign_num: number;
}

interface NavamsaChartProps {
  navamsaHouses: NavamsaHouse[];
  name?: string;
}

export function NavamsaChart({ navamsaHouses, name = "Customer" }: NavamsaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  // House positions in the chart (0-indexed, matching the array structure)
  const housePositions = [
    { houseIndex: 0, className: "div2" }, // 1st House - top center
    { houseIndex: 1, className: "div" }, // 2nd House - top right
    { houseIndex: 2, className: "div7" }, // 3rd House - right middle
    { houseIndex: 3, className: "div9" }, // 4th House - right bottom
    { houseIndex: 4, className: "div10" }, // 5th House - bottom right
    { houseIndex: 5, className: "div11" }, // 6th House - bottom left
    { houseIndex: 6, className: "div3" }, // 7th House - left bottom
    { houseIndex: 7, className: "div6" }, // 8th House - left middle
    { houseIndex: 8, className: "div4" }, // 9th House - left top
    { houseIndex: 9, className: "div5" }, // 10th House - top left
    { houseIndex: 10, className: "div8" }, // 11th House - top left-middle
    { houseIndex: 11, className: "div1" }, // 12th House - top right-middle
  ];

  // Convert chart to image after it renders
  useEffect(() => {
    const convertToImage = async () => {
      if (!chartRef.current) return;

      // Wait for chart to fully render
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // Dynamically import html2canvas
        const html2canvas = (await import("html2canvas")).default;
        
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: "#ffffff",
          scale: 1, // Standard scale
          logging: false,
          useCORS: true,
        });

        const dataUrl = canvas.toDataURL("image/png");
        setImageUrl(dataUrl);
        setIsGenerating(false);
      } catch (error) {
        console.error("Error converting chart to image:", error);
        setIsGenerating(false);
      }
    };

    convertToImage();
  }, [navamsaHouses, name]);

  return (
    <div id="kundali-wrapper" style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
      <div id="kundali-container">
        <h2>Navamsa Chart of {name}</h2>
        {isGenerating && (
          <div className="text-center py-4 text-sm text-gray-600">Generating chart image...</div>
        )}
        {imageUrl ? (
          <div className="flex flex-col items-center">
            <img
              src={imageUrl}
              alt={`Navamsa Chart of ${name}`}
              className="max-w-full h-auto border-2 border-gray-300 rounded-lg shadow-lg"
              style={{ maxWidth: "20rem" }}
            />
            <a
              href={imageUrl}
              download={`navamsa-${name.replace(/\s+/g, "-")}.png`}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Download Chart Image
            </a>
          </div>
        ) : (
          <div ref={chartRef} style={{ display: isGenerating ? "block" : "none" }}>
            <div className="kundali" id="kundali">
            <div className="texts" id="texts">
              <svg
                width="570"
                height="570"
                viewBox="0 0 570 570"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_5_6)">
                  <g clipPath="url(#clip1_5_6)">
                    <rect
                      x="37"
                      y="37"
                      width="496"
                      height="496"
                      rx="22"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <rect
                      x="2.2"
                      y="2.2"
                      width="565.6"
                      height="565.6"
                      stroke="black"
                      strokeWidth="4.4"
                    />
                    <line
                      x1="1.58579"
                      y1="567.586"
                      x2="566.586"
                      y2="2.58581"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <line
                      x1="568.587"
                      y1="568.415"
                      x2="1.58701"
                      y2="2.41542"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <rect
                      x="164"
                      y="2"
                      width="242"
                      height="35"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <rect
                      x="533"
                      y="406"
                      width="242"
                      height="35"
                      transform="rotate(-90 533 406)"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <rect
                      x="2"
                      y="406"
                      width="242"
                      height="35"
                      transform="rotate(-90 2 406)"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <rect
                      x="164"
                      y="533"
                      width="242"
                      height="35"
                      stroke="black"
                      strokeWidth="4"
                    />
                  </g>
                  <g clipPath="url(#clip2_5_6)">
                    <path
                      d="M162 163.5C162 163.5 166 105 208 92.5C250 80 286 37.5 286 37.5"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M407.5 163C407.5 163 403.5 104.5 361.5 92C319.5 79.5 283.5 37 283.5 37"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M162 405C162 405 166 463.5 208 476C250 488.5 286 531 286 531"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M407.5 405.5C407.5 405.5 403.5 464 361.5 476.5C319.5 489 283.5 531.5 283.5 531.5"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M164.5 407C164.5 407 106 403 93.5 361C81 319 38.5 283 38.5 283"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M164 161.5C164 161.5 105.5 165.5 93 207.5C80.5 249.5 38 285.5 38 285.5"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M404 407C404 407 462.5 403 475 361C487.5 319 530 283 530 283"
                      stroke="black"
                      strokeWidth="4"
                    />
                    <path
                      d="M404.5 161.5C404.5 161.5 463 165.5 475.5 207.5C488 249.5 530.5 285.5 530.5 285.5"
                      stroke="black"
                      strokeWidth="4"
                    />
                  </g>
                  <g transform="translate(40 40) scale(0.85)">
                    <svg
                      version="1.1"
                      viewBox="0 0 2048 242"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        transform="translate(176)"
                        d="m0 0 8 1 6 4 5 7 1 3v44l-3 103-3 16-4 7-6 2-7-3-7-7-8-14-12-23-14-21-10-13-11-13-4-4v-2h-2l-4-5-8-7-14-12-18-12-14-7-16-5-21-3-5-3-4-6-1-6 5-5 13-8 13-4h21l16 5 16 9 16 13 19 19 9 11 11 15 11 17 10 18 8 15 4 9 1-17v-48l-2-16-4-11-7-11-13-13v-6l3-3 19-8z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(583,58)"
                        d="m0 0h18l8 3 4 4 1 8-2 38v28l6 9 7 8 1 6-4 8-9 10-7 5-3 1h-9l-8-4-9-10-5-11-2-9v-22l2-32v-9l-4-5-8-4h-9l-8 4-6 8-5 13-1 5v22l4 13 3 5 6 3 16 1 4 3v7l-15 15-11 7h-11l-10-5-10-9-9-14-5-13-2-9v-22l4-15 7-13 11-12 11-7 11-4 5-1h14l12 3 10 5v-6l4-5z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1446,67)"
                        d="m0 0 16 2 6 4 2 5-1 28-1 22v20l5 8 9 11-1 8-6 9-10 9-7 3h-7l-8-4-5-4-7-10-4-12-1-7v-15l2-33v-12l-5-6-6-3h-11l-7 4-6 8-4 10-2 9v20l4 13 4 6 6 3 16 1 4 5-2 6-14 14-10 6-2 1h-9l-12-6-11-11-8-14-5-15-1-6v-19l4-16 7-13 11-12 9-6 12-5 4-1h18l13 4 7 4v-6l4-5z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(2012,67)"
                        d="m0 0 16 2 6 4 2 7-2 45v23l4 7 9 10 1 7-4 8-9 10-8 5-3 1h-7l-8-4-6-5-7-11-3-9-1-7v-17l2-33v-11l-5-6-6-3h-11l-6 3-6 7-5 12-2 8v21l4 13 4 6 6 3 16 1 4 5-2 6-13 13-9 6-4 2h-9l-12-6-11-11-8-14-5-15-1-6v-19l4-16 7-13 9-10 9-7 11-5 7-2h18l13 4 7 4v-6l2-4 4-2z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(695,13)"
                        d="m0 0h7l11 2h18l10-2h8l7 3 5 6v30l-3 60v21l4 10 7 8 6 6v7l-5 13-6 9-9 8-5 2h-13l-10-6-7-8-5-10-2-9-1-14 1-31 2-37v-25l-2-11-4-6-7-6-8-7-2-3v-7z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(372,58)"
                        d="m0 0 10 1 6 4 7 8 2 14v16l-1 39v54l3 6 9 10 2 7-3 7-6 8-8 7-7 3h-7l-10-5-8-9-5-11-2-11v-108l-2-8-4-2-11-8-3-4v-5l4-3 21-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1165,13)"
                        d="m0 0 9 1 9 6 5 8 1 7-1 103 2 13 12 16-1 9-6 8-7 7-10 5h-7l-8-4-8-8-7-14-1-4v-104l-1-11-3-6-14-10-3-5 1-5 6-3 16-4 11-4z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1792,13)"
                        d="m0 0 9 1 9 6 5 8 1 7v28l-1 47v77l-3 5-4 2h-25l-8-3-4-6v-14l1-12 1-40v-68l-2-5-13-10-5-6 1-5 6-3 16-4 11-4z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1521,14)"
                        d="m0 0h9l8 4 7 8 1 2 1 10v55l-1 86-3 8-4 5-7 3h-10l-10-3-6-4-3-7v-18l2-67v-34l-2-13-4-5-12-9-3-5 2-5 9-3 12-3z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(947,70)"
                        d="m0 0 9 1 7 4 6 7 2 7v30l-1 32 2 9 5 6 12 4 4 4-1 7-9 7-15 7-5 1h-8l-10-3-9-7-6-9-2-11 1-34v-17l-2-11-7-6-8-6-3-3-1-5 4-4 21-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1243,70)"
                        d="m0 0h7l7 3 6 5 4 8 1 7v14l-1 15v26l4 7 9 11 1 5-4 9-8 9-9 6-3 1h-7l-10-5-8-9-5-10-2-9v-54l-2-5-1-3-4-2-11-8-2-4 1-5 6-3 15-4z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(772,93)"
                        d="m0 0h8l15 4 11 6 14 10 13 11 14 12 10 7 10 5 8 1 5-2 9-10h6l9 6 6 8 3 9v14l-5 10-5 6-9 5-4 1h-16l-13-5-11-7-12-11-10-10-11-14-9-12-11-13-10-8-16-8v-10z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1105,71)"
                        d="m0 0h18l11 4 4 4v5l-5 3-15 2-7 4-5 8-3 10-1 7v8l3 15 5 10 7 6 6 2h11l5 3 1 7-7 8-5 6-8 7-10 6-9-1-9-6-11-11-9-14-5-13-3-14v-19l4-16 6-12 8-9 10-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(431,61)"
                        d="m0 0h9l10 5 9 9 9 15 6 18 1 5v22l-3 12-7 13-11 11-15 8-9 3-6 1h-13l-6-4-2-4 1-5 8-5 9-5 7-8 4-9 2-10v-10l-4-16-5-8-5-4-12-5-4-4 1-7 7-7 14-9z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1014,70)"
                        d="m0 0 13 1 10 5 4 4 1 4v11l-2 32v19l3 7 9 11 2 3v6l-6 10-8 8-10 5h-7l-8-4-8-8-7-14-1-6v-80l3-7 5-5z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1853,70)"
                        d="m0 0 10 1 12 6 9 10 8 16 3 12 1 7v11l-3 16-5 13-7 12-8 10-8 8-8 4-7-1-6-4-10-9-7-9-2-4 1-6h8l13 4h9l3-4 2-8v-14l-4-17-5-13-7-8-11-5-10-4-3-4 1-5 10-7 13-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1671,70)"
                        d="m0 0h8l9 3 2 2v16l4 8 11 12 19 19 7 8 9 12 5 11 1 3v12l-4 8-8 7-8 3-11 1-8-3-2-3 1-10 1-3v-11l-4-8-12-13-11-12-8-7-8-8-10-13-3-7-1-9 3-9 7-6 5-2z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(261,70)"
                        d="m0 0 6 1 3 3v7l-5 11-2 9v18l3 11 6 12 5 6 8 5 3 1h7l10-4 10-5 6 1 3 4v6l-7 11-13 13-10 6-2 1h-12l-10-3-11-6-12-11-8-9-7-12-5-15v-21l4-11 6-10 9-10 8-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(803,13)"
                        d="m0 0h14l16 4 11 6 11 9 7 10 4 10 1 4v13l-4 10-9 10-8 6-14 7-5 2-5-1-6-5-7-9 12-14 2-4v-11l-5-10-8-7-8-3h-7l-10 4-4 2-5-1-5-5-1-6 4-8 11-8 11-4z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(44,55)"
                        d="m0 0 9 3 6 4 4 5 2 13v56l-2 22-4 16-6 9-8 4h-10l-12-5-13-10-2-2v-15l2-9 15-2 6-4 6-7 4-11 3-24z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1605,65)"
                        d="m0 0 7 1 11 8 6 7 1 2v9l-4 10-4 3-22 3-12 4-9 6-7 8-6 10-3 3-5-1-2-3v-12l4-15 8-16 8-10 10-9 12-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1578,139)"
                        d="m0 0 6 2 16 10 9 3 9-2 9-6 2-1h6l4 5 1 4v7l-4 13-6 9-4 5-10 6-5 1h-8l-10-4-7-7-7-14-4-13-1-12 2-5z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(305,58)"
                        d="m0 0h8l8 7 5 10 2 7v13l-4 10-6 8-10 8-10 5-11 3-6-1-4-5 1-5 9-8 3-6v-12l-4-6-6-8v-5l5-4 12-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1307,70)"
                        d="m0 0h10l9 3 6 6 1 8-3 19-4 11-2 2-9-1-6-2h-8l-12 6-6-1-4-5-1-2v-13l4-11 8-11 8-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1660,144)"
                        d="m0 0 8 1 5 5 4 10 6 12 12 13v7l-7 3-13-1-13-5-9-7-5-6-2-5v-9l4-10 4-5z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                      <path
                        transform="translate(1703,70)"
                        d="m0 0 8 1h12l8-1 7 3 7 8 3 8v13l-5 8-4 3-9 1-6-4-6-8-5-9-11-13-2-2v-6z"
                        fill="rgba(195, 155, 91, 0.4)"
                      />
                    </svg>
                  </g>
                </g>
                <defs>
                  <clipPath id="clip0_5_6">
                    <rect width="570" height="570" fill="white" />
                  </clipPath>
                  <clipPath id="clip1_5_6">
                    <rect width="570" height="570" fill="white" />
                  </clipPath>
                  <clipPath id="clip2_5_6">
                    <rect
                      width="492.5"
                      height="494.5"
                      fill="white"
                      transform="translate(38 37)"
                    />
                  </clipPath>
                </defs>
              </svg>

              <div className="houses">
                <div className="nd-house">
                  <span className="single-line">1st House</span>
                </div>
                <div className="nd-house1">
                  <span className="single-line">2nd House</span>
                </div>
                <div className="nd-house3">
                  <span className="single-line">3rd House</span>
                </div>
                <div className="nd-house4">
                  <span className="single-line">4th House</span>
                </div>
                <div className="nd-house5">
                  <span className="single-line">5th House</span>
                </div>
                <div className="nd-house11">
                  <span className="single-line">6th House</span>
                </div>
                <div className="nd-house10">
                  <span className="single-line">7th House</span>
                </div>
                <div className="nd-house9">
                  <span className="single-line">8th House</span>
                </div>
                <div className="nd-house7">
                  <span className="single-line">9th House</span>
                </div>
                <div className="nd-house6">
                  <span className="single-line">10th House</span>
                </div>
                <div className="nd-house2">
                  <span className="single-line">11th House</span>
                </div>
                <div className="nd-house8">
                  <span className="single-line">12th House</span>
                </div>
              </div>
              <div className="numbers">
                {housePositions.map(({ houseIndex, className }) => {
                  const house = navamsaHouses[houseIndex];
                  const planets = house?.planets || [];
                  
                  return (
                    <div key={houseIndex} className={className}>
                      <span className="single-line">
                        {planets.map((planet, idx) => (
                          <React.Fragment key={idx}>
                            {planet.abbreviation}
                            <br />
                          </React.Fragment>
                        ))}
                        {house?.sidereal_sign_num}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
      <style>{`
        .kundali-child {
          position: absolute;
          top: calc(50% - 250px);
          left: calc(50% - 250px);
          border-radius: 24px;
          border: 4px solid #000;
          box-sizing: border-box;
          width: 31.25rem;
          height: 31.25rem;
        }
        .kundali-inner, .kundali-item {
          position: absolute;
          top: calc(50% - 285px);
          left: calc(50% - 285px);
          border: 4.4px solid #000;
          box-sizing: border-box;
          width: 35.625rem;
          height: 35.625rem;
        }
        .kundali-inner {
          top: calc(50% - 0px);
          left: calc(50% - 247px);
          border: 4px solid #000;
          width: 21.875rem;
          height: 21.875rem;
          transform: rotate(-45deg);
          transform-origin: 0 0;
          display: none;
        }
        .kundali-child1, .kundali-child2, .line-icon {
          position: absolute;
          top: 60.688rem;
          left: 0.688rem;
          width: 0.375rem;
          height: 0.625rem;
          object-fit: contain;
        }
        .kundali-child1, .kundali-child2 {
          top: 13.688rem;
          left: 13.625rem;
          width: 35.313rem;
          height: 35.313rem;
        }
        .kundali-child2 {
          top: 13.5rem;
          width: 35.438rem;
          height: 35.375rem;
        }
        .rectangle-div {
          position: absolute;
          top: 13.438rem;
          left: calc(50% - 123px);
          border: 4px solid #000;
          box-sizing: border-box;
          width: 15.375rem;
          height: 2.438rem;
        }
        .kundali-child3 {
          top: calc(50% + 123px);
          left: calc(50% + 246px);
          transform: rotate(-90deg);
          transform-origin: 0 0;
        }
        .kundali-child3, .kundali-child4, .kundali-child5 {
          position: absolute;
          border: 4px solid #000;
          box-sizing: border-box;
          width: 15.375rem;
          height: 2.438rem;
        }
        .kundali-child4 {
          top: calc(50% + 123px);
          left: calc(50% - 285px);
          transform: rotate(-90deg);
          transform-origin: 0 0;
        }
        .kundali-child5 {
          top: 46.625rem;
          left: calc(50% - 123px);
        }
        .nd-house, .nd-house1, .nd-house2 {
          position: absolute;
          top: 0.5rem;
          left: 17.063rem;
          font-weight: 500;
          font-size: 0.85rem;
        }
        .nd-house1, .nd-house2 {
          left: 3.563rem;
        }
        .nd-house2 {
          top: 2.875rem;
          left: 35.1rem;
          transform: rotate(90deg);
          transform-origin: 0 0;
        }
        .nd-house3, .nd-house4, .nd-house5, .nd-house6, .nd-house7 {
          position: absolute;
          top: 7.438rem;
          left: 0.5rem;
          font-weight: 500;
          transform: rotate(-90deg);
          transform-origin: 0 0;
        }
        .nd-house4, .nd-house5, .nd-house6, .nd-house7 {
          top: 18.625rem;
        }
        .nd-house5, .nd-house6, .nd-house7 {
          top: 31.188rem;
        }
        .nd-house6, .nd-house7 {
          top: 14.938rem;
          left: 35.1rem;
          transform: rotate(90deg);
        }
        .nd-house7 {
          top: 27.625rem;
          left: 35.1rem;
        }
        .nd-house8, .nd-house9 {
          position: absolute;
          top: 0.5rem;
          left: 26.5rem;
          font-weight: 500;
        }
        .nd-house9 {
          top: 33.7rem;
        }
        .div, .div1, .div2, .div3, .div4, .nd-house10, .nd-house11 {
          position: absolute;
          top: 33.7rem;
          left: 15rem;
          font-weight: 500;
          font-size: 0.75rem;
        }
        .div, .div1, .div2, .div3, .div4, .nd-house11 {
          left: 2.563rem;
        }
        .div, .div1, .div2, .div3, .div4 {
          top: 4.063rem;
          left: 9rem;
        }
        .div1, .div2, .div3, .div4 {
          left: 25.5rem;
        }
        .div2, .div3, .div4 {
          top: 7rem;
          left: 17rem;
        }
        .div3, .div4 {
          top: 26rem;
        }
        .div4 {
          left: 31rem;
        }
        .div10, .div11, .div5, .div6, .div7, .div8, .div9 {
          position: absolute;
          top: 19rem;
          left: 25rem;
          font-weight: 500;
        }
        .div10, .div11, .div6, .div7, .div8, .div9 {
          top: 30rem;
        }
        .div10, .div11, .div7, .div8, .div9 {
          top: 9.8rem;
          left: 2.9rem;
        }
        .div10, .div11, .div8, .div9 {
          left: 31rem;
        }
        .div10, .div11, .div9 {
          top: 13rem;
          left: 6.938rem;
        }
        .div10, .div11 {
          top: 26rem;
          left: 2.9rem;
        }
        .div11 {
          top: 30rem;
          left: 8.5rem;
        }
        .petal1-icon, .petal1-icon1 {
          position: absolute;
          top: 15.75rem;
          left: calc(50% - 123px);
          width: 15.344rem;
          height: 7.906rem;
        }
        .petal1-icon1 {
          top: 46.656rem;
        }
        .petal1-icon2, .petal1-icon3 {
          position: absolute;
          top: calc(50% - 123.5px);
          left: 15.813rem;
          width: 7.906rem;
          height: 15.344rem;
          object-fit: contain;
        }
        .petal1-icon3 {
          left: 38.688rem;
        }
         .kundali {
           width: 36rem;
           position: relative;
           background-color: #fff;
           height: 36rem;
           text-align: left;
           font-size: 0.9rem;
           color: #000;
           overflow: hidden;
           font-family: Inter;
           margin: auto;
         }
        .houses {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .numbers {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .single-line {
          display: block;
          line-height: 1.2;
        }
        #kundali-wrapper {
          margin: 20px 0;
        }
        #kundali-container h2 {
          text-align: center;
          margin-bottom: 20px;
          font-size: 1.2rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
