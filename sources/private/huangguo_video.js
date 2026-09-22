/** @type {import('../_venera_.js')} */
class PrivateHuangguoVideo extends ComicSource {
  type = "video";
  name = "黄果漫剧（私人）";
  key = "private_huangguo_video";
  version = "1.1.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/huangguo_video.js";

  settings = {
    domain: {
      title: "视频站地址",
      type: "input",
      default: "https://kvl1.zlgncitla.cc",
    },
    addressPage: {
      title: "最新地址获取页（仅供查看）",
      type: "input",
      default: "https://huangguoai.ai/",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domain") || this.settings.domain.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("//")) return `https:${text}`;
    return `${this.baseUrl}${text.startsWith("/") ? "" : "/"}${text}`;
  }

  clean(value) {
    return String(value || "")
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, "&")
      .trim();
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? String(node.attributes[name] || "") : "";
  }

  pageUrl(path, page) {
    let value = String(path || "/");
    let current = Number(page) || 1;
    if (current <= 1) return this.absoluteUrl(value);
    if (!value.endsWith("/")) value += "/";
    return this.absoluteUrl(`${value}${current}/`);
  }

  parsePageCount(doc) {
    let maxPage = 1;
    for (let link of doc.querySelectorAll("a[href]")) {
      let label = this.textOf(link);
      if (/^\d+$/.test(label)) maxPage = Math.max(maxPage, parseInt(label, 10));
    }
    return Math.min(maxPage, 500);
  }

  coverFrom(item) {
    let image = item.querySelector("img");
    if (!image) return "";
    return (
      this.attribute(image, "data-src") ||
      this.attribute(image, "data-original") ||
      this.attribute(image, "src")
    );
  }

  parseComic(item) {
    let link = item.querySelector("a[href*='/detail/']");
    let titleNode = item.querySelector(".hg-drama-card__title") ||
      item.querySelector("h2, h3") || link;
    if (!link || !titleNode) return null;
    let id = this.attribute(link, "href");
    let title = this.textOf(titleNode);
    if (!id || !title) return null;
    let tags = [];
    for (let tag of item.querySelectorAll(".hg-tag")) {
      let text = this.textOf(tag);
      if (text && tags.indexOf(text) < 0) tags.push(text);
    }
    let episode = this.textOf(item.querySelector(".hg-drama-card__episode"));
    let score = this.textOf(item.querySelector(".hg-drama-card__score"));
    let description = this.textOf(item.querySelector(".hg-drama-card__desc"));
    return new Comic({
      id: id,
      title: title,
      subTitle: [episode, score].filter((v) => v).join(" · "),
      cover: this.absoluteUrl(this.coverFrom(item)),
      tags: tags,
      description: description || tags.join("、") || "黄果漫剧",
    });
  }

  parseComics(doc) {
    let result = [];
    let seen = {};
    for (let item of doc.querySelectorAll(".hg-drama-card")) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      result.push(comic);
    }
    // 兼容站点改版后没有卡片 class 的页面。
    if (result.length === 0) {
      for (let link of doc.querySelectorAll("a[href*='/detail/']")) {
        let id = this.attribute(link, "href");
        let title = this.textOf(link);
        if (!id || !title || seen[id]) continue;
        seen[id] = true;
        result.push(new Comic({
          id: id,
          title: title,
          cover: this.absoluteUrl(this.attribute(link.querySelector("img"), "src")),
          description: "黄果漫剧",
        }));
      }
    }
    return result;
  }

  async loadList(path, page) {
    let res = await Network.get(this.pageUrl(path || "/", page || 1), this.headers);
    if (res.status !== 200) throw `黄果漫剧接口状态异常: ${res.status}`;
    let doc = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(doc),
      maxPage: this.parsePageCount(doc),
    };
    doc.dispose();
    return result;
  }

  explore = [{
    title: "黄果漫剧",
    type: "multiPartPage",
    load: async () => {
      let value = await this.loadList("/", 1);
      return value.comics.length > 0 ? [{ title: "最新", comics: value.comics }] : [];
    },
  }];

  category = {
    title: "黄果漫剧",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["最新", "AI成人短剧", "AI成人漫剧", "AI换脸", "AI魔改"],
      itemType: "category",
      categoryParams: ["/", "/ai-duanju/", "/ai-manju/", "/ai-huanlian/", "/ai-mogai/"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || "/"), page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      return this.loadList(`/search/video/${encodeURIComponent(value)}/`, page || 1);
    },
    optionList: [],
  };

  parseInitialData(doc) {
    let script = doc.getElementById("videoInitialData") ||
      doc.querySelector("script[type='application/json'][id*='video']");
    if (!script) return null;
    let raw = this.clean(script.text || "");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  parseEpisodes(doc) {
    let chapters = {};
    for (let link of doc.querySelectorAll("[data-ep-id], .hg-web-detail__ep-grid a[href*='/video/']")) {
      let href = this.attribute(link, "href");
      let label = this.textOf(link) || `第${this.attribute(link, "data-ep-id")}集`;
      if (href && label) chapters[href] = label;
    }
    return chapters;
  }

  comic = {
    onThumbnailLoad: () => ({ headers: this.headers }),

    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `黄果漫剧详情状态异常: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let title = this.textOf(doc.querySelector(".hg-web-detail__info h1, h1")) || "黄果漫剧";
      let image = doc.querySelector("meta[property='og:image']") || doc.querySelector("img");
      let cover = this.attribute(image, "content") || this.coverFrom(doc);
      let description = this.attribute(doc.querySelector("meta[name='description']"), "content") ||
        this.textOf(doc.querySelector(".hg-web-detail__desc, .hg-web-detail__desc-wrap"));
      let tags = [];
      let keywords = this.attribute(doc.querySelector("meta[name='keywords']"), "content");
      for (let value of String(keywords || "").split(/[,，]/)) {
        value = value.trim();
        if (value && value !== title && tags.indexOf(value) < 0) tags.push(value);
      }
      let chapters = this.parseEpisodes(doc);
      doc.dispose();
      return new ComicDetails({
        title: title,
        cover: this.absoluteUrl(cover),
        description: description || "黄果漫剧",
        tags: { 类型: tags },
        chapters: chapters,
        url: url,
        maxPage: Object.keys(chapters).length,
      });
    },

    loadEp: async (comicId, epId) => {
      let url = String(epId || "").trim();
      if (!/^https?:\/\//i.test(url)) url = this.absoluteUrl(url || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `黄果漫剧播放页状态异常: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let data = this.parseInitialData(doc);
      doc.dispose();
      if (!data) throw "黄果当前集没有可用的视频地址（播放页未返回 videoInitialData）";
      let videoUrl = this.clean(data.videoSrc || "");
      if (!/^https?:\/\//i.test(videoUrl)) {
        let sources = data.epPlaySrcs && typeof data.epPlaySrcs === "object" ? data.epPlaySrcs : {};
        for (let key of Object.keys(sources)) {
          let candidate = this.clean(sources[key]);
          if (/^https?:\/\//i.test(candidate)) {
            videoUrl = candidate;
            break;
          }
        }
      }
      if (!/^https?:\/\//i.test(videoUrl))
        throw "黄果当前集没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: String(data.title || "黄果漫剧"),
            poster: this.clean(data.posterSrc || ""),
            headers: {
              "User-Agent": this.headers["User-Agent"],
              Referer: url,
            },
          })}`,
        ],
      };
    },
  };
}
