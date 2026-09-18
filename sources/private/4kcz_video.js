/** @type {import('../_venera_.js')} */
class Private4KczVideo extends ComicSource {
  type = "video";
  name = "4K厂长影视（私人）";
  key = "private_4kcz_video";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/4kcz_video.js";

  settings = {
    domains: {
      title: "选择域名",
      type: "select",
      options: [
        { value: "https://www.4kcz.com", text: "www.4kcz.com" },
        { value: "https://www.cz4k.com", text: "www.cz4k.com（备用）" },
        { value: "https://cz01.tv", text: "cz01.tv（备用）" },
      ],
      default: "https://www.4kcz.com",
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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Referer: `${this.baseUrl}/`,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    let text = String(value).trim();
    if (/^https?:\/\//i.test(text)) return text;
    if (text.indexOf("//") === 0) return `https:${text}`;
    return `${this.baseUrl}${text.indexOf("/") === 0 ? "" : "/"}${text}`;
  }

  cleanText(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .trim();
  }

  safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (_) {
      return value;
    }
  }

  attribute(node, name) {
    if (!node) return "";
    return (node.attributes && node.attributes[name]) || "";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  pageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let href = this.attribute(node, "href");
      let match = href.match(/\/page\/(\d+)(?:[/?#]|$)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
      match = href.match(/[?&](?:paged|page)=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComic(item) {
    let link = item.querySelector("h3.dytit a[href*='/movie/']");
    if (!link) link = item.querySelector("a[href*='/movie/']");
    if (!link) return null;

    let href = this.attribute(link, "href");
    let title = this.attribute(link, "title") || this.textOf(link);
    let image = item.querySelector("img[data-original]") || item.querySelector("img");
    let cover =
      this.attribute(image, "data-original") ||
      this.attribute(image, "data-src") ||
      this.attribute(image, "src");
    let subtitle = this.textOf(item.querySelector(".inzhuy"));
    if (!href || !title) return null;
    return new Comic({
      id: href,
      title: title,
      subTitle: subtitle,
      cover: this.absoluteUrl(cover),
      description: subtitle,
    });
  }

  parseComics(document) {
    let items = document.querySelectorAll("div.bt_img li");
    if (items.length === 0) items = document.querySelectorAll("li");
    let comics = [];
    let seen = {};
    for (let item of items) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  async loadList(path, page) {
    let current = Number(page) || 1;
    let value = String(path || "/");
    let url = this.absoluteUrl(value);
    if (current > 1) {
      if (value.indexOf("?") >= 0) url += `&paged=${current}`;
      else url = `${url.replace(/\/+$/, "")}/page/${current}/`;
    }
    let res = await Network.get(url, this.headers);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(document),
      maxPage: this.pageCount(document),
    };
    document.dispose();
    return result;
  }

  explore = [
    {
      title: "4K厂长影视",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["首页推荐", "/"],
          ["最新电影", "/zuixindianying"],
          ["国产剧", "/gcj"],
          ["美剧", "/meijutt"],
          ["韩剧", "/hanjutv"],
          ["番剧", "/fanju"],
        ];
        let result = [];
        for (let section of sections) {
          try {
            let page = await this.loadList(section[1], 1);
            if (page.comics.length > 0) {
              result.push({
                title: section[0],
                comics: page.comics,
                viewMore: `category:${section[0]}@${section[1]}`,
              });
            }
          } catch (_) {}
        }
        return result;
      },
    },
  ];

  category = {
    title: "4K厂长影视",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["最新电影", "国产剧", "美剧", "韩剧", "番剧", "剧场版"],
        itemType: "category",
        categoryParams: [
          "/zuixindianying",
          "/gcj",
          "/meijutt",
          "/hanjutv",
          "/fanju",
          "/dongmanjuchangban",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      return this.loadList(param || "/", page || 1);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      let current = Number(page) || 1;
      let url = `${this.baseUrl}/nimasile?q=${encodeURIComponent(value)}`;
      if (current > 1) url += `&paged=${current}`;
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let result = {
        comics: this.parseComics(document),
        maxPage: this.pageCount(document),
      };
      document.dispose();
      return result;
    },
    optionList: [],
  };

  parseDetail(document, id, url) {
    let title = this.textOf(document.querySelector(".moviedteail_tt h1"));
    if (!title) title = this.textOf(document.querySelector("h1"));
    let image = document.querySelector(".dyimg img");
    let cover =
      this.attribute(image, "data-original") ||
      this.attribute(image, "data-src") ||
      this.attribute(image, "src");
    let description = this.textOf(document.querySelector(".yp_context"));
    if (!description) {
      let meta = document.querySelector('meta[name="description"]');
      description = this.attribute(meta, "content");
    }

    let chapters = new Map();
    for (let node of document.querySelectorAll(".paly_list_btn a[href*='/v_play/']")) {
      let href = this.attribute(node, "href");
      let name = this.textOf(node) || "播放";
      if (href) chapters.set(href, name);
    }
    let tags = [];
    for (let node of document.querySelectorAll(".moviedteail_list a[rel='tag']")) {
      let value = this.textOf(node);
      if (value && tags.indexOf(value) < 0) tags.push(value);
    }
    return new ComicDetails({
      title: title || `4K厂长影视 ${id}`,
      cover: this.absoluteUrl(cover),
      description: description,
      tags: { 标签: tags },
      chapters: chapters,
      url: url,
    });
  }

  extractStream(value) {
    let text = this.cleanText(value);
    let match = text.match(/[?&]url=([^&"']+)/i);
    if (match) {
      let decoded = this.cleanText(this.safeDecode(match[1]));
      if (/\.(?:m3u8|mp4)(?:$|\?)/i.test(decoded)) return decoded;
    }
    match = text.match(
      /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/i
    );
    return match ? this.safeDecode(match[0]) : "";
  }

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let result = this.parseDetail(document, id, url);
      document.dispose();
      return result;
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let iframe = document.querySelector("iframe.viframe") || document.querySelector("iframe");
      let src = this.attribute(iframe, "src");
      document.dispose();
      let videoUrl = this.extractStream(src || res.body);
      if (!videoUrl) throw "4K厂长影视当前线路没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "4K厂长影视",
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
