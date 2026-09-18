/** @type {import('../_venera_.js')} */
class PrivateHuangguoVideo extends ComicSource {
  name = "黄果短剧（私人）";
  key = "private_huangguo_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/huangguo_video.js";

  settings = {
    domains: {
      title: "站点域名",
      type: "input",
      default: "https://bwaf4.mbdjkget.cc",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domains") || this.settings.domains.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    let text = String(value).trim();
    if (/^https?:\/\//i.test(text)) return text;
    if (text.indexOf("//") === 0) return `https:${text}`;
    return `${this.baseUrl}${text.indexOf("/") === 0 ? "" : "/"}${text}`;
  }

  attribute(node, name) {
    if (!node) return "";
    return (node.attributes && node.attributes[name]) || "";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  request(path) {
    return Network.get(this.absoluteUrl(path), this.headers);
  }

  parseId(value) {
    let match = String(value || "").match(/\/detail\/([^/?#]+)\/?/i);
    return match ? match[1] : String(value || "").trim();
  }

  parseComic(item) {
    let link = item.querySelector("a[href*='/detail/']");
    if (!link) return null;

    let href = this.attribute(link, "href");
    let id = this.parseId(href);
    if (!id) return null;

    let titleNode = item.querySelector(".hg-drama-card__title a") || link;
    let title = this.textOf(titleNode) || this.attribute(titleNode, "title");
    let image = item.querySelector(".hg-drama-card__cover img");
    let cover =
      this.attribute(image, "data-src") ||
      this.attribute(image, "data-original") ||
      this.attribute(image, "src");
    let subtitle = this.textOf(item.querySelector(".hg-drama-card__episode"));
    let description = this.textOf(item.querySelector(".hg-drama-card__desc"));
    let tags = item
      .querySelectorAll(".hg-drama-card__tags a")
      .map((tag) => this.textOf(tag))
      .filter((tag) => tag !== "");

    if (!title || !cover) return null;
    return new Comic({
      id: id,
      title: title,
      subTitle: subtitle,
      cover: this.absoluteUrl(cover),
      tags: tags,
      description: description,
    });
  }

  parseComics(document, selector) {
    let root = selector ? document.querySelector(selector) : document;
    if (!root) root = document;
    let comics = [];
    let seen = {};
    for (let item of root.querySelectorAll("div.hg-drama-card")) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  parsePageCount(document) {
    let jump = document.querySelector("[data-hg-pager-jump]");
    let pages = parseInt(this.attribute(jump, "data-pages"), 10);
    if (pages > 0) return pages;
    return 1;
  }

  async loadList(path, page) {
    let current = Number(page) || 1;
    let target = path;
    if (current > 1) target = `${String(path).replace(/\/+$/, "")}/${current}/`;
    let res = await this.request(target);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let comics = this.parseComics(document, "div.hg-card-grid[data-channel-panel='latest']");
    if (comics.length === 0) comics = this.parseComics(document);
    let result = { comics: comics, maxPage: this.parsePageCount(document) };
    document.dispose();
    return result;
  }

  explore = [
    {
      title: "黄果短剧",
      type: "multiPartPage",
      load: async () => {
        let page = await this.loadList("/", 1);
        return page.comics.length > 0
          ? [{ title: "最新短剧", comics: page.comics }]
          : [];
      },
    },
  ];

  category = {
    title: "黄果短剧",
    parts: [
      {
        name: "频道",
        type: "fixed",
        categories: ["AI成人短剧", "AI成人漫剧", "AI换脸", "AI魔改"],
        itemType: "category",
        categoryParams: ["/ai-duanju/", "/ai-manju/", "/ai-huanlian/", "/ai-mogai/"],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      return this.loadList(param || "/ai-duanju/", page || 1);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let encoded = encodeURIComponent(String(keyword || "").trim());
      let current = Number(page) || 1;
      let path = `/search/video/${encoded}/`;
      if (current > 1) path += `${current}/`;
      let res = await this.request(path);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = this.parseComics(
        document,
        "div.hg-search-results div.hg-card-grid"
      );
      if (comics.length === 0) comics = this.parseComics(document);
      let result = { comics: comics, maxPage: 1 };
      document.dispose();
      return result;
    },
    optionList: [],
  };

  parseInitialData(body) {
    let match = String(body || "").match(
      /<script[^>]+id=["']videoInitialData["'][^>]*>([\s\S]*?)<\/script>/i
    );
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (_) {
      return null;
    }
  }

  parseEpisodeCount(document) {
    let count = 0;
    for (let node of document.querySelectorAll("[data-ep-id]")) {
      let value = parseInt(this.attribute(node, "data-ep-id"), 10);
      if (value > count) count = value;
    }
    let totalText = this.textOf(document.querySelector(".hg-web-detail__episode"));
    let match = totalText.match(/(\d+)/);
    if (match) count = Math.max(count, parseInt(match[1], 10));
    return count;
  }

  parseDetailComic(document, id) {
    let title = this.textOf(document.querySelector(".hg-web-detail__info h1"));
    let image = document.querySelector(".hg-web-detail__poster img");
    let cover =
      this.attribute(image, "data-src") || this.attribute(image, "src");
    let description = this.textOf(document.querySelector(".hg-web-detail__desc"));
    let tags = document
      .querySelectorAll(".hg-web-detail__tags a")
      .map((tag) => this.textOf(tag))
      .filter((tag) => tag !== "");
    let author = this.textOf(document.querySelector(".hg-web-detail__author strong"));
    let chapters = new Map();
    for (let node of document.querySelectorAll("[data-ep-id]")) {
      let ep = this.attribute(node, "data-ep-id");
      if (!ep || chapters.has(ep)) continue;
      let label = this.textOf(node) || `第${ep}集`;
      chapters.set(ep, label.indexOf("集") >= 0 ? label : `第${label}集`);
    }
    return {
      title: title || `黄果短剧 ${id}`,
      cover: this.absoluteUrl(cover),
      description: description,
      tags: { 标签: tags },
      chapters: chapters,
      uploader: author,
      maxPage: this.parseEpisodeCount(document),
    };
  }

  episodePath(comicId, epId) {
    let ep = parseInt(String(epId || "1"), 10) || 1;
    return ep <= 1 ? `/video/${comicId}/` : `/video/${comicId}/ep-${ep}/`;
  }

  comic = {
    loadInfo: async (id) => {
      let res = await this.request(`/detail/${id}/`);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let info = this.parseDetailComic(document, id);
      document.dispose();
      return new ComicDetails(info);
    },

    loadEp: async (comicId, epId) => {
      let path = this.episodePath(comicId, epId);
      let res = await this.request(path);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let data = this.parseInitialData(res.body);
      if (!data) throw "视频页面缺少播放数据";

      let ep = String(data.ep || epId || "1");
      let videoUrl = data.videoSrc ||
        (data.epPlaySrcs && (data.epPlaySrcs[ep] || data.epPlaySrcs[String(epId)]));
      if (!videoUrl) throw "当前集数没有可用的视频地址";

      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: `${data.title || "黄果短剧"} 第${ep}集`,
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
