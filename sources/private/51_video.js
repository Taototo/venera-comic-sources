/** @type {import('../_venera_.js')} */
class Private51Video extends ComicSource {
  type = "video";
  name = "51吃瓜（私人）";
  key = "private_51_video";
  version = "1.1.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/51_video.js";

  settings = {
    domain: {
      title: "站点地址",
      type: "input",
      default: "https://analyst.gcmzmnli.cc",
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
    if (value === "/" || value === "") return this.absoluteUrl(`/page/${current}/`);
    if (!value.endsWith("/")) value += "/";
    return this.absoluteUrl(`${value}page/${current}/`);
  }

  parsePageCount(doc) {
    let maxPage = 1;
    for (let link of doc.querySelectorAll("a[href]")) {
      let label = this.textOf(link);
      if (/^\d+$/.test(label)) maxPage = Math.max(maxPage, parseInt(label, 10));
    }
    return Math.min(maxPage, 5000);
  }

  extractCover(item) {
    for (let script of item.querySelectorAll("script")) {
      let text = this.textOf(script);
      let match = text.match(/loadBannerDirect\s*\(\s*['"]([^'"]+)['"]/i);
      if (match) return match[1];
    }
    let image = item.querySelector("img[data-src], img[data-original], img");
    return image
      ? this.attribute(image, "data-src") ||
          this.attribute(image, "data-original") ||
          this.attribute(image, "src")
      : "";
  }

  parseComic(item) {
    let link = item.querySelector("a[href*='/archives/']");
    if (!link) link = item.querySelector("a[href]");
    let titleNode = item.querySelector(".post-card-title, h2, h3") || link;
    if (!link || !titleNode) return null;
    let id = this.attribute(link, "href");
    let title = this.textOf(titleNode);
    if (!id || !title || !/\/archives\//i.test(id)) return null;
    let tags = [];
    for (let category of item.querySelectorAll("a[href*='/category/']")) {
      let text = this.textOf(category);
      if (text && tags.indexOf(text) < 0) tags.push(text);
    }
    let info = this.textOf(item.querySelector(".post-card-info"));
    return new Comic({
      id: id,
      title: title,
      subTitle: info,
      cover: this.clean(this.extractCover(item)),
      tags: tags,
      description: [info, tags.join("、")].filter((v) => v).join(" · ") || "51吃瓜",
    });
  }

  parseComics(doc) {
    let result = [];
    let seen = {};
    for (let item of doc.querySelectorAll("article[itemtype*='BlogPosting'], article")) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      result.push(comic);
    }
    return result;
  }

  async loadList(path, page) {
    let res = await Network.get(this.pageUrl(path || "/", page || 1), this.headers);
    if (res.status !== 200) throw `51吃瓜接口状态异常: ${res.status}`;
    let doc = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(doc),
      maxPage: this.parsePageCount(doc),
    };
    doc.dispose();
    return result;
  }

  category = {
    title: "51吃瓜",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: [
        "全部", "今日吃瓜", "学生校园", "网红黑料", "热门大瓜", "吃瓜榜单", "必看大瓜",
        "AI成人短剧", "成人视频", "伦理道德", "国产视频", "探花精选", "网黄合集", "骚男骚女",
        "明星爆料", "海外吃瓜", "人人吃瓜", "领导干部", "软萌甜妹", "吃瓜看戏", "擦边撩骚",
        "性爱技巧", "吃瓜新闻", "原创博主", "51剧场", "往期活动",
      ],
      itemType: "category",
      categoryParams: [
        "/", "/category/wpcz/", "/category/xsxy/", "/category/whhl/", "/category/rdsj/",
        "/category/mrdg/", "/category/bkdg/", "/category/cbdj/", "/category/ysyl/",
        "/category/lldd/", "/category/gcjq/", "/category/thjx/", "/category/whhj/",
        "/category/snsn/", "/category/whmx/", "/category/hwcg/", "/category/rrcg/",
        "/category/ldcg/", "/category/jpll/", "/category/qubk/", "/category/dcbq/",
        "/category/zzs/", "/category/cgxw/", "/category/yczq/", "/category/51djc/",
        "/category/51hd/",
      ],
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
      return this.loadList(`/search/${encodeURIComponent(value)}/`, page || 1);
    },
    optionList: [],
  };

  parseConfig(value) {
    let raw = this.clean(value);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  comic = {
    onThumbnailLoad: () => ({ headers: this.headers }),

    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `51吃瓜详情状态异常: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let title = this.textOf(doc.querySelector("h1.post-title, .post-title, h1")) || "51吃瓜";
      let image = doc.querySelector("meta[property='og:image']") || doc.querySelector("img");
      let cover = this.attribute(image, "content") ||
        this.attribute(image, "data-src") || this.attribute(image, "src");
      let description = this.attribute(doc.querySelector("meta[name='description']"), "content") ||
        this.textOf(doc.querySelector(".video-desc, article"));
      let tags = [];
      for (let tag of doc.querySelectorAll("meta[property='video:tag'], a[href*='/category/']")) {
        let text = this.attribute(tag, "content") || this.textOf(tag);
        if (text && tags.indexOf(text) < 0) tags.push(text);
      }
      let standard = {};
      let h265 = {};
      let index = 0;
      for (let player of doc.querySelectorAll(".dplayer")) {
        let config = this.parseConfig(this.attribute(player, "data-config"));
        if (!config) continue;
        let label = this.attribute(player, "data-video_title") || `第${++index}集`;
        let normal = config.video && this.clean(config.video.url);
        let high = config.video_h265 && this.clean(config.video_h265.url);
        if (/^https?:\/\//i.test(normal)) standard[normal] = label;
        if (/^https?:\/\//i.test(high)) h265[high] = label;
      }
      let chapters = {};
      if (Object.keys(standard).length > 0) chapters["标准线路"] = standard;
      if (Object.keys(h265).length > 0) chapters["H265线路"] = h265;
      doc.dispose();
      return new ComicDetails({
        title: title,
        cover: this.clean(cover),
        description: description || "51吃瓜",
        tags: { 类型: tags },
        chapters: chapters,
        url: url,
        maxPage: Object.keys(standard).length + Object.keys(h265).length,
      });
    },

    loadEp: async (comicId, epId) => {
      let videoUrl = this.clean(epId);
      if (!/^https?:\/\//i.test(videoUrl)) throw "51吃瓜当前集没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "51吃瓜",
            headers: {
              "User-Agent": this.headers["User-Agent"],
              Referer: this.absoluteUrl(comicId),
            },
          })}`,
        ],
      };
    },
  };
}
