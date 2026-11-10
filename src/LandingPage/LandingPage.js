/**
 * Landing page shown before the main atlas viewer.
 *
 * Builds its own DOM (hero copy, language toggle, demo modal, decorative
 * particles), animates the particle network and the SVG neural graph, and
 * switches copy between Chinese and English. `onStart` is fired when the
 * user clicks the start button so mainApp can take over.
 *
 * Call destroy() to remove listeners and the injected markup.
 */
import "./landing.css";

export class LandingPage {
  constructor(options = {}) {
    this.container = options.container || document.body;

    this.onStart = options.onStart || (() => {});

    this.element = null;

    this.animationFrameId = null;

    this.neuralNodes = [];
    this.neuralConnections = [];

    this.particlesContainer = null;
    this.nodes = [];
    this.lines = [];
    this.nodeCount = 65;
    this.connectionDistance = 15;
    this.maxConnections = 35;

    this.currentLang = "zh";

    this.translations = {
      zh: {
        title: "多尺度皮层脑图谱交互可视化系统",
        description:
          "面向脑图谱探索与可视化的 Web 交互系统，支持多种皮层脑图谱及不同分辨率脑区的三维可视化，并提供脑区选择、跨尺度对应及功能数据动态展示等功能。",
        feature1: "多图谱",
        feature2: "多分辨率",
        feature3: "三维交互",
        feature4: "动态数据",
        demoButton: "查看系统演示",
        startButton: "开始探索",
        demoModalTitle: "系统演示",
        fundingTitle: "项目支持",
        funding1: "国家自然科学基金",
        funding2: "浙江省自然科学基金",
        funding3: "大学生创新创业训练计划项目",
        inventors: "25级硕士研究生 张雪、杨晓敏、李悦等",
        advisor: "指导教师：王博丞",
        registration: "软件著作权登记号：2026SR0914716",
        langButton: "EN",
      },
      en: {
        title:
          "Multi-Scale Cortical Brain Atlas Interactive Visualization System",
        description:
          "A web-based interactive system for brain atlas exploration and visualization, supporting multiple cortical brain atlases and 3D visualization of brain regions at different resolutions, with features including brain region selection, cross-scale correspondence, and dynamic functional data display.",
        feature1: "Multi-Atlas",
        feature2: "Multi-Resolution",
        feature3: "3D Interaction",
        feature4: "Dynamic Data",
        demoButton: "View System Demo",
        startButton: "Start Exploring",
        demoModalTitle: "System Demo",
        fundingTitle: "Project Support",
        funding1: "National Natural Science Foundation of China",
        funding2: "Zhejiang Provincial Natural Science Foundation of China",
        funding3:
          "College Student Innovation & Entrepreneurship Training Program",
        inventors:
          "Inventors: 2025 Master's Student Xue Zhang, Xiaomin Yang , Yue Li et al.",
        advisor: "Advisor: Bocheng Wang",
        registration: "Software Copyright Registration No: 2026SR0914716",
        langButton: "中文",
      },
    };
  }

  init() {
    this.create();

    this.bindEvents();

    this.initNeuralNetwork();

    this.animateNeuralNetwork();

    this.initParticles();

    this.animateParticles();

    this.setLanguage("zh");
  }

  create() {
    this.element = document.createElement("div");

    this.element.id = "landing-page";

    this.element.innerHTML = `

            <!-- Background -->

            <div
                class="landing-page__background"
                aria-hidden="true">
            </div>


            <!-- Neural network backdrop -->

            <div
                class="landing-page__particles"
                aria-hidden="true">
            </div>


            <!-- Header -->

            <header
                class="landing-page__header">

                <div
                    class="landing-page__logo">

                    <img
                        src="./image/logo.png"
                        alt="学校标志">

                </div>

                <div
                    class="landing-page__lang-toggle">

                    <button
                        class="landing-page__lang-btn active"
                        data-lang="zh">
                        中文
                    </button>

                    <button
                        class="landing-page__lang-btn"
                        data-lang="en">
                        EN
                    </button>

                </div>

            </header>


            <!-- Main hero -->

            <main
                class="landing-page__hero">


                <!-- Left content -->

                <section
                    class="landing-page__content">




                    <h1
                        class="landing-page__title">

                        多尺度皮层脑图谱交互可视化系统

                    </h1>


                    <p
                        class="landing-page__description">

                        面向脑图谱探索与可视化的 Web 交互系统，
                        支持多种皮层脑图谱及不同分辨率脑区的三维可视化，
                        并提供脑区选择、跨尺度对应及功能数据动态展示等功能。

                    </p>


                    <!-- Feature list -->

                    <div
                        class="landing-page__features">


                        <div
                            class="landing-page__feature">

                            <div
                                class="landing-page__feature-title">
                                多图谱
                            </div>


                        </div>


                        <div
                            class="landing-page__feature">

                            <div
                                class="landing-page__feature-title">
                                多分辨率
                            </div>


                        </div>


                        <div
                            class="landing-page__feature">

                            <div
                                class="landing-page__feature-title">
                                三维交互
                            </div>


                        </div>


                        <div
                            class="landing-page__feature">

                            <div
                                class="landing-page__feature-title">
                                动态数据
                            </div>


                        </div>


                    </div>


                    <!-- Action buttons -->

                    <div
                        class="landing-page__actions">


                        <button
                            id="landing-demo-button"
                            class="landing-page__demo-button">

                            <span
                                class="landing-page__demo-icon">
                                ▶
                            </span>

                            <span>
                                查看系统演示
                            </span>

                        </button>


                        <button
                            id="landing-start-button"
                            class="landing-page__start-button">

                            <span>
                                 开始探索
                            </span>

                            <span
                                class="landing-page__button-arrow">
                                →
                            </span>

                        </button>


                    </div>


                </section>


                <!-- Right-side brain video -->

                <section
                    class="landing-page__brain">


                    <div
                        class="landing-page__brain-glow">
                    </div>


                    <video
                        id="landing-video"
                        class="landing-page__brain-video"
                        autoplay
                        loop
                        muted
                        playsinline>

                        <source
                            src="./Video/rotation1.webm"
                            type="video/webm">

                        您的浏览器不支持视频播放。

                    </video>


                </section>


            </main>


            <div class="landing-page__funding-info">
                <div class="landing-page__funding-title">
                    <span class="landing-page__funding-title-line"></span>
                    项目支持
                    <span class="landing-page__funding-title-line"></span>
                </div>
                <div class="landing-page__funding-items">
                    <div class="landing-page__funding-item">
                        <span>国家自然科学基金</span>
                    </div>
                    <div class="landing-page__funding-item">
                        <span>浙江省自然科学基金</span>
                    </div>
                    <div class="landing-page__funding-item">
                        <span>大学生创新创业训练计划项目</span>
                    </div>
                </div>
            </div>


            <div class="landing-page__copyright">
                <div class="landing-page__inventors">
                    <span lang="zh"><strong>发明人：</strong>25级硕士研究生 张雪、杨晓敏、李悦等</span>
                    <span lang="zh"><strong>指导教师：</strong>王博丞</span>
                    <span lang="en"><strong>Inventors</strong>: 2025 Master's Student Xue Zhang , Xiaomin Yang, Yue Li et al.</span>
                    <span lang="en"><strong>Advisor</strong>: Bocheng Wang</span>
                </div>
                <span class="landing-page__registration" lang="zh"><strong>软件著作权登记号：</strong>2026SR0914716</span>
                <span class="landing-page__registration" lang="en"><strong>Software Copyright Registration No:</strong> 2026SR0914716</span>
            </div>


            </main>





            <!-- Demo modal -->

            <div
                id="landing-demo-modal"
                class="landing-page__demo-modal"
                aria-hidden="true">


                <div
                    class="landing-page__demo-backdrop">
                </div>


                <div
                    class="landing-page__demo-dialog">


                    <div
                        class="landing-page__demo-header">

                        <span>
                            系统演示
                        </span>


                        <button
                            id="landing-demo-close"
                            class="landing-page__demo-close"
                            aria-label="关闭演示">

                            ×

                        </button>

                    </div>


                    <div
                        class="landing-page__demo-player">


                        <video
                            id="landing-demo-video"
                            preload="metadata"
                            playsinline
                            controls>

                            <source
                                src="./Video/display2.mp4"
                                type="video/mp4">

                            您的浏览器不支持视频播放。

                        </video>


                    </div>


                </div>

            </div>

        `;

    this.container.appendChild(this.element);
  }

  bindEvents() {
    const startButton = this.element.querySelector("#landing-start-button");

    if (startButton) {
      startButton.addEventListener("click", () => {
        this.onStart();
      });
    }

    const demoButton = this.element.querySelector("#landing-demo-button");

    const demoModal = this.element.querySelector("#landing-demo-modal");

    const demoVideo = this.element.querySelector("#landing-demo-video");

    if (demoButton && demoModal) {
      demoButton.addEventListener("click", () => {
        this.openDemo();
      });
    }

    const closeButton = this.element.querySelector("#landing-demo-close");

    const backdrop = this.element.querySelector(".landing-page__demo-backdrop");

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this.closeDemo();
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", () => {
        this.closeDemo();
      });
    }

    this.handleKeyDown = (event) => {
      if (event.key === "Escape") {
        this.closeDemo();
      }
    };

    document.addEventListener("keydown", this.handleKeyDown);

    if (demoVideo) {
      demoVideo.addEventListener("ended", () => {
        demoVideo.currentTime = 0;
      });
    }

    const langToggle = this.element.querySelector(".landing-page__lang-toggle");

    if (langToggle) {
      const langButtons = langToggle.querySelectorAll(
        ".landing-page__lang-btn",
      );

      langButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const lang = button.getAttribute("data-lang");

          this.setLanguage(lang);
        });
      });
    }
  }

  openDemo() {
    const modal = this.element.querySelector("#landing-demo-modal");

    const video = this.element.querySelector("#landing-demo-video");

    if (!modal) {
      return;
    }

    modal.classList.add("is-visible");

    modal.setAttribute("aria-hidden", "false");

    if (video) {
      video.currentTime = 0;

      video.play().catch(() => {});
    }
  }

  closeDemo() {
    const modal = this.element.querySelector("#landing-demo-modal");

    const video = this.element.querySelector("#landing-demo-video");

    if (!modal) {
      return;
    }

    modal.classList.remove("is-visible");

    modal.setAttribute("aria-hidden", "true");

    if (video) {
      video.pause();

      video.currentTime = 0;
    }
  }

  initNeuralNetwork() {
    const nodesGroup = this.element.querySelector(
      ".landing-page__neural-nodes",
    );

    const connectionsGroup = this.element.querySelector(
      ".landing-page__neural-connections",
    );

    const signalsGroup = this.element.querySelector(
      ".landing-page__neural-signals",
    );

    if (!nodesGroup || !connectionsGroup || !signalsGroup) {
      return;
    }

    /*
     * Fixed topology, concentrated on the right side so the graph reads as
     * connected to the rotating brain.
     */
    const nodePositions = [
      { x: 610, y: 150 },
      { x: 690, y: 110 },
      { x: 770, y: 145 },

      { x: 565, y: 230 },
      { x: 650, y: 205 },
      { x: 735, y: 225 },
      { x: 830, y: 205 },

      { x: 600, y: 315 },
      { x: 685, y: 290 },
      { x: 775, y: 320 },
      { x: 865, y: 300 },

      { x: 555, y: 390 },
      { x: 645, y: 375 },
      { x: 730, y: 405 },
      { x: 820, y: 380 },

      { x: 610, y: 465 },
      { x: 700, y: 455 },
      { x: 790, y: 470 },

      { x: 675, y: 535 },
      { x: 765, y: 535 },
    ];

    /* Hard-coded edges; nothing is generated at runtime. */
    const connections = [
      [0, 1],
      [1, 2],

      [0, 4],
      [1, 4],
      [1, 5],
      [2, 5],
      [2, 6],

      [3, 4],
      [4, 5],
      [5, 6],

      [3, 7],
      [4, 7],
      [4, 8],
      [5, 8],
      [5, 9],
      [6, 9],
      [6, 10],

      [7, 8],
      [8, 9],
      [9, 10],

      [7, 11],
      [7, 12],
      [8, 12],
      [8, 13],
      [9, 13],
      [9, 14],
      [10, 14],

      [11, 12],
      [12, 13],
      [13, 14],

      [11, 15],
      [12, 15],
      [12, 16],
      [13, 16],
      [13, 17],
      [14, 17],

      [15, 16],
      [16, 17],

      [15, 18],
      [16, 18],
      [16, 19],
      [17, 19],

      [18, 19],
    ];

    connections.forEach(([a, b], index) => {
      const nodeA = nodePositions[a];

      const nodeB = nodePositions[b];

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );

      line.setAttribute("x1", nodeA.x);

      line.setAttribute("y1", nodeA.y);

      line.setAttribute("x2", nodeB.x);

      line.setAttribute("y2", nodeB.y);

      line.classList.add("landing-page__neural-line");

      connectionsGroup.appendChild(line);

      this.neuralConnections.push({
        element: line,
        index,
      });

      /* Only a few edges carry a travelling signal. */
      if (index === 5 || index === 17 || index === 30 || index === 39) {
        const signal = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );

        signal.setAttribute("r", "2.2");

        signal.classList.add("landing-page__neural-signal");

        signal.style.animationDelay = `${index * 0.45}s`;

        signalsGroup.appendChild(signal);
      }
    });

    nodePositions.forEach((position, index) => {
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );

      circle.setAttribute("cx", position.x);

      circle.setAttribute("cy", position.y);

      circle.setAttribute("r", index % 6 === 0 ? "3.2" : "2.2");

      circle.classList.add("landing-page__neural-node");

      if (index % 6 === 0) {
        circle.classList.add("landing-page__neural-node--active");
      }

      nodesGroup.appendChild(circle);

      this.neuralNodes.push({
        element: circle,

        baseRadius: index % 6 === 0 ? 3.2 : 2.2,

        phase: Math.random() * Math.PI * 2,

        speed: 0.0003 + Math.random() * 0.0002,
      });
    });

    /* Attach each signal to the edge it travels along. */
    const signals = signalsGroup.querySelectorAll(
      ".landing-page__neural-signal",
    );

    const signalConnections = [
      connections[5],
      connections[17],
      connections[30],
      connections[39],
    ];

    signals.forEach((signal, index) => {
      const connection = signalConnections[index];

      if (!connection) {
        return;
      }

      signal._connection = connection;
    });
  }

  animateNeuralNetwork() {
    const time = Date.now();

    this.neuralNodes.forEach((node) => {
      const pulse = (Math.sin(time * node.speed + node.phase) + 1) / 2;

      const radius = node.baseRadius + pulse * 0.6;

      node.element.setAttribute("r", radius);

      node.element.style.opacity = 0.45 + pulse * 0.35;
    });

    /*
     * Only node breathing is animated; the topology never changes.
     */
    this.animationFrameId = requestAnimationFrame(() => {
      this.animateNeuralNetwork();
    });
  }

  show() {
    if (this.element) {
      this.element.classList.remove("hidden");
    }
  }

  hide() {
    if (this.element) {
      this.element.classList.add("hidden");
    }
  }

  setLanguage(lang) {
    if (lang !== "zh" && lang !== "en") {
      return;
    }

    this.currentLang = lang;

    this.element.setAttribute("data-lang", lang);

    this.updateActiveButton();

    this.updateTexts();
  }

  updateActiveButton() {
    const buttons = this.element.querySelectorAll(".landing-page__lang-btn");

    buttons.forEach((button) => {
      const buttonLang = button.getAttribute("data-lang");

      if (buttonLang === this.currentLang) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  updateTexts() {
    const t = this.translations[this.currentLang];

    const title = this.element.querySelector(".landing-page__title");
    if (title) {
      title.textContent = t.title;
    }

    const description = this.element.querySelector(
      ".landing-page__description",
    );
    if (description) {
      description.textContent = t.description;
    }

    const featureTitles = this.element.querySelectorAll(
      ".landing-page__feature-title",
    );
    const featureKeys = ["feature1", "feature2", "feature3", "feature4"];
    featureTitles.forEach((el, index) => {
      if (featureKeys[index]) {
        el.textContent = t[featureKeys[index]];
      }
    });

    const demoButtonText = this.element.querySelector(
      "#landing-demo-button span:last-child",
    );
    if (demoButtonText) {
      demoButtonText.textContent = t.demoButton;
    }

    const startButtonText = this.element.querySelector(
      "#landing-start-button span:first-child",
    );
    if (startButtonText) {
      startButtonText.textContent = t.startButton;
    }

    const demoModalTitle = this.element.querySelector(
      ".landing-page__demo-header span",
    );
    if (demoModalTitle) {
      demoModalTitle.textContent = t.demoModalTitle;
    }

    const fundingTitle = this.element.querySelector(
      ".landing-page__funding-title",
    );
    if (fundingTitle) {
      fundingTitle.textContent = t.fundingTitle;
    }

    const fundingItems = this.element.querySelectorAll(
      ".landing-page__funding-item",
    );
    const fundingKeys = ["funding1", "funding2", "funding3"];
    fundingItems.forEach((el, index) => {
      if (fundingKeys[index]) {
        el.textContent = t[fundingKeys[index]];
      }
    });

    const fundingNote = this.element.querySelector(
      ".landing-page__funding-note",
    );
    if (fundingNote) {
      fundingNote.innerHTML = t.fundingNote;
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);

      this.animationFrameId = null;
    }

    if (this.handleKeyDown) {
      document.removeEventListener("keydown", this.handleKeyDown);
    }

    if (this.element) {
      this.element.remove();

      this.element = null;
    }

    this.neuralNodes = [];

    this.neuralConnections = [];
  }

  initParticles() {
    this.particlesContainer = this.element.querySelector(
      ".landing-page__particles",
    );
    this.nodes = [];
    this.lines = [];

    this.createNodes();
    this.createConnections();
  }

  createNodes() {
    for (let i = 0; i < this.nodeCount; i++) {
      const node = document.createElement("div");
      node.classList.add("landing-page__particle");

      const rand = Math.random();
      let particleType = "drift";

      if (rand < 0.1) {
        particleType = "flash";
        node.classList.add("landing-page__particle--flash");
      } else if (rand < 0.25) {
        particleType = "pulse";
      } else if (rand < 0.4) {
        particleType = "float";
      } else if (rand < 0.55) {
        particleType = "glow";
      }

      const size = Math.random() * 3 + 2;

      const centerLeft = 72;
      const centerTop = 48;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 35 + 5;
      const leftPos = centerLeft + Math.cos(angle) * radius;
      const topPos = centerTop + Math.sin(angle) * radius;

      const duration = Math.random() * 25 + 20;
      const delay = Math.random() * -30;
      const opacity = Math.random() * 0.3 + 0.2;

      let animationName;
      switch (particleType) {
        case "flash":
          animationName = "particleDrift, particleFlash";
          break;
        case "pulse":
          animationName = "particlePulse";
          break;
        case "float":
          animationName = "particleFloat";
          break;
        case "glow":
          animationName = "particleGlow";
          break;
        default:
          animationName = "particleDrift";
      }

      node.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${leftPos}%;
                top: ${topPos}%;
                animation: ${animationName} ${duration}s linear ${delay}s infinite;
                opacity: ${opacity};
            `;

      this.particlesContainer.appendChild(node);
      this.nodes.push({
        element: node,
        x: leftPos,
        y: topPos,
        baseX: leftPos,
        baseY: topPos,
        driftOffset: Math.random() * Math.PI * 2,
        driftSpeed: Math.random() * 0.0003 + 0.0001,
        driftAmplitude: Math.random() * 4 + 2,
      });
    }
  }

  createConnections() {
    let connectionsCreated = 0;

    for (
      let i = 0;
      i < this.nodes.length && connectionsCreated < this.maxConnections;
      i++
    ) {
      for (
        let j = i + 1;
        j < this.nodes.length && connectionsCreated < this.maxConnections;
        j++
      ) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.connectionDistance && Math.random() < 0.4) {
          const line = document.createElement("div");
          line.classList.add("landing-page__network-line");

          const hasDataFlow = Math.random() < 0.15;
          if (hasDataFlow) {
            line.classList.add("landing-page__network-line--dataflow");
            line.style.backgroundSize = "200px 1px";
          }

          const length = distance * (this.particlesContainer.offsetWidth / 100);
          const angle =
            Math.atan2(
              (nodeB.y - nodeA.y) * this.particlesContainer.offsetHeight,
              (nodeB.x - nodeA.x) * this.particlesContainer.offsetWidth,
            ) *
            (180 / Math.PI);

          line.style.cssText += `
                        width: ${length}px;
                        left: ${nodeA.x}%;
                        top: ${nodeA.y}%;
                        transform: rotate(${angle}deg);
                    `;

          this.particlesContainer.appendChild(line);
          this.lines.push({
            element: line,
            nodeA: nodeA,
            nodeB: nodeB,
            hasDataFlow: hasDataFlow,
          });

          connectionsCreated++;
        }
      }
    }
  }

  animateNodes() {
    const time = Date.now();
    const containerWidth = this.particlesContainer.offsetWidth;
    const containerHeight = this.particlesContainer.offsetHeight;

    this.nodes.forEach((node) => {
      const driftX =
        Math.sin(time * node.driftSpeed + node.driftOffset) *
        node.driftAmplitude;
      const driftY =
        Math.cos(time * node.driftSpeed * 0.7 + node.driftOffset) *
        node.driftAmplitude;

      node.x = node.baseX + driftX;
      node.y = node.baseY + driftY;

      const pixelX = (node.baseX / 100) * containerWidth;
      const pixelY = (node.baseY / 100) * containerHeight;

      node.element.style.transform = `translate(${driftX * (containerWidth / 100)}px, ${driftY * (containerHeight / 100)}px)`;
    });

    this.lines.forEach((line) => {
      const nodeA = line.nodeA;
      const nodeB = line.nodeB;

      const ax = (nodeA.baseX / 100) * containerWidth;
      const ay = (nodeA.baseY / 100) * containerHeight;
      const bx = (nodeB.baseX / 100) * containerWidth;
      const by = (nodeB.baseY / 100) * containerHeight;

      const driftAx =
        Math.sin(time * nodeA.driftSpeed + nodeA.driftOffset) *
        nodeA.driftAmplitude *
        (containerWidth / 100);
      const driftAy =
        Math.cos(time * nodeA.driftSpeed * 0.7 + nodeA.driftOffset) *
        nodeA.driftAmplitude *
        (containerHeight / 100);
      const driftBx =
        Math.sin(time * nodeB.driftSpeed + nodeB.driftOffset) *
        nodeB.driftAmplitude *
        (containerWidth / 100);
      const driftBy =
        Math.cos(time * nodeB.driftSpeed * 0.7 + nodeB.driftOffset) *
        nodeB.driftAmplitude *
        (containerHeight / 100);

      const finalAx = ax + driftAx;
      const finalAy = ay + driftAy;
      const finalBx = bx + driftBx;
      const finalBy = by + driftBy;

      const dx = finalBx - finalAx;
      const dy = finalBy - finalAy;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      line.element.style.width = `${length}px`;
      line.element.style.transform = `translate(${finalAx}px, ${finalAy}px) rotate(${angle}deg)`;
    });
  }

  animateParticles() {
    this.animateNodes();
    this.animationFrameId = requestAnimationFrame(() => {
      this.animateParticles();
    });
  }
}