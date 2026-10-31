/** @type {import('../_venera_.js')} */
class Manhuazhan extends ComicSource {
  name = "漫画站";
  key = "private_manhuazhan";
  version = "1.0.2";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/manhuazhan.js?v=1.0.2";
  _activeDomain = "";

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "manhuazhan.org",
    },
  };

  normalizeDomain(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  get configuredDomain() {
    return this.normalizeDomain(this.loadSetting("domain") || this.settings.domain.default);
  }

  get domainCandidates() {
    let candidates = [
      this._activeDomain,
      this.configuredDomain,
      "manhuazhan.org",
      "manhuazhan.com",
      "www.manhuazhan.org",
      "www.manhuazhan.com",
    ];
    let result = [];
    for (let domain of candidates) {
      domain = this.normalizeDomain(domain);
      if (domain && result.indexOf(domain) < 0) result.push(domain);
    }
    return result;
  }

  get baseUrl() {
    let domain = this._activeDomain || this.configuredDomain;
    return `https://${domain}`;
  }

  headersFor(domain) {
    return {
      "http_client": "dart:io",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: `https://${domain}/`,
    };
  }

  get headers() {
    return this.headersFor(this._activeDomain || this.configuredDomain);
  }

  absoluteUrl(value, domain) {
    if (!value) return "";
    value = String(value).trim();
    if (/^https?:\/\//i.test(value)) return value.replace(/^http:/i, "https:");
    if (value.indexOf("//") === 0) return `https:${value}`;
    let baseUrl = `https://${this.normalizeDomain(domain || this._activeDomain || this.configuredDomain)}`;
    return `${baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`;
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? String(node.attributes[name] || "") : "";
  }

  async request(path) {
    let input = String(path || "/");
    let pathOnly = input.replace(/^https?:\/\/[^/]+/i, "") || "/";
    let lastError = "";
    for (let domain of this.domainCandidates) {
      try {
        let res = await Network.get(this.absoluteUrl(pathOnly, domain), this.headersFor(domain));
        if (res.status === 200) {
          this._activeDomain = domain;
          return res;
        }
        lastError = `请求失败: ${res.status}`;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || "无法连接到漫画站";
  }

  pageUrl(path, page) {
    let value = String(path || "/category").replace(/\/+$/, "") || "/category";
    value = value.replace(/\/page\/\d+$/i, "");
    let current = Number(page) || 1;
    return current > 1 ? `${value}/page/${current}` : value;
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let match = this.attribute(node, "href").match(/\/page\/(\d+)(?:[/?#]|$)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let link of document.querySelectorAll("#contents a[href^='/comic/'], .d-item-list a[href^='/comic/']")) {
      let id = this.attribute(link, "href");
      if (!id || seen[id]) continue;
      let image = link.querySelector("img");
      let cover = image
        ? this.attribute(image, "data-original") ||
          this.attribute(image, "data-src") ||
          this.attribute(image, "src")
        : "";
      let title = this.attribute(link, "title") || this.textOf(link.querySelector("h3"));
      let description = this.textOf(link.querySelector("p"));
      if (!title || !cover) continue;
      seen[id] = true;
      comics.push(
        new Comic({
          id: id,
          title: title,
          cover: this.absoluteUrl(cover),
          description: description,
        })
      );
    }
    return comics;
  }

  async parseListResponse(res) {
    if (/<title>\s*安全验证\s*-\s*漫画站/i.test(res.body) || /class=["']verify-box["']/i.test(res.body)) {
      throw "漫画站要求图形验证码，请先在浏览器中访问漫画站完成验证后再搜索";
    }
    let document = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(document),
      maxPage: this.parsePageCount(document),
    };
    document.dispose();
    return result;
  }

  async loadList(path, page) {
    return this.parseListResponse(await this.request(this.pageUrl(path, page)));
  }

  explore = [
    {
      title: "漫画站",
      type: "multiPageComicList",
      load: async (page) => this.loadList("/category", page),
    },
  ];

  category = {
    title: "漫画站",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["全部", "国产漫画", "日本漫画", "韩国漫画", "欧美漫画"],
        itemType: "category",
        categoryParams: [
          "/category",
          "/category/list/1",
          "/category/list/2",
          "/category/list/3",
          "/category/list/4",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(param || "/category", page),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = encodeURIComponent(String(keyword || "").trim());
      let path = `/search?key=${value}`;
      if (Number(page) > 1) path += `&page=${Number(page)}`;
      return this.parseListResponse(await this.request(path));
    },
    optionList: [],
  };

  metadata(document) {
    let result = {};
    for (let node of document.querySelectorAll(".d-vod-type p")) {
      let value = this.textOf(node);
      let separator = value.indexOf("：");
      if (separator < 0) separator = value.indexOf(":");
      if (separator >= 0) result[value.substring(0, separator).trim()] = value.substring(separator + 1).trim();
    }
    return result;
  }

  comic = {
    loadInfo: async (id) => {
      let path = String(id || "");
      let res = await this.request(path);
      let document = new HtmlDocument(res.body);
      let meta = this.metadata(document);
      let title = this.textOf(document.querySelector(".d-name h1"));
      let coverNode = document.querySelector(".d-vod-pic img");
      let cover = this.attribute(coverNode, "src") || this.attribute(coverNode, "data-original");
      let tags = [];
      for (let node of document.querySelectorAll(".d-vod-type a")) {
        let tag = this.textOf(node);
        if (tag && tags.indexOf(tag) < 0) tags.push(tag);
      }
      let chapterMap = new Map();
      for (let node of document.querySelectorAll("#playlist .d-player-list a[href^='/chapter/']")) {
        let chapterId = this.attribute(node, "href");
        let chapterTitle = this.textOf(node);
        if (chapterId && chapterTitle) chapterMap.set(chapterId, chapterTitle);
      }
      let description = this.textOf(document.querySelector(".d-des"));
      document.dispose();
      return new ComicDetails({
        title: title || "漫画站",
        subTitle: meta["作者"] || "",
        cover: this.absoluteUrl(cover),
        description: description,
        tags: {
          "作者": meta["作者"] ? [meta["作者"]] : [],
          "类型": tags,
          "状态": meta["状态"] ? [meta["状态"]] : [],
        },
        chapters: chapterMap,
        updateTime: meta["更新时间"] || "",
        url: this.absoluteUrl(path),
      });
    },

    loadEp: async (comicId, epId) => {
      let chapterId = String(epId || comicId || "");
      let res = await this.request(chapterId);
      let cidMatch = res.body.match(/var\s+cid\s*=\s*(\d+)/i);
      let dataMatch = res.body.match(/var\s+DATA\s*=\s*["']([\s\S]*?)["']\s*;/i);
      if (!cidMatch || !dataMatch) throw "本章中未找到图片数据";
      let cid = parseInt(cidMatch[1], 10);
      // pic.js chooses one of these Base64 keys with cid % 10 before the XOR pass.
      let keys = [
        "NC1iWGQ5aU4=",
        "NC1SWHlqcnk=",
        "NC1vWXZ3Vnk=",
        "NC00Wlk1N1U=",
        "NC1tYkpwVTc=",
        "NC02TU0yRWk=",
        "NC01NFRpUXI=",
        "NC1QaDV4eDk=",
        "NC1iWWdlUFI=",
        "NC1aOUEzYlc=",
      ];
      let cipher = new Uint8Array(Convert.decodeBase64(dataMatch[1].replace(/\s+/g, "")));
      let key = new Uint8Array(Convert.decodeBase64(keys[Math.abs(cid) % keys.length]));
      let encoded = new Uint8Array(cipher.length);
      for (let i = 0; i < cipher.length; i++) encoded[i] = cipher[i] ^ key[i % key.length];
      let imageJson = Convert.decodeUtf8(Convert.decodeBase64(Convert.decodeUtf8(encoded.buffer)));
      let pages = JSON.parse(imageJson);
      let images = [];
      for (let page of Array.isArray(pages) ? pages : []) {
        let image = page && page.url ? this.absoluteUrl(page.url) : "";
        if (image && images.indexOf(image) < 0) images.push(image);
      }
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    onImageLoad: (url, comicId, epId) => ({
      headers: Object.assign({}, this.headers, {
        Referer: epId ? this.absoluteUrl(epId) : `${this.baseUrl}/`,
      }),
    }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["manhuazhan.com", "www.manhuazhan.com"],
      linkToId: (url) => {
        let match = String(url || "").match(
          /^https?:\/\/(?:www\.)?manhuazhan\.com(\/comic\/\d+)(?:[/?#]|$)/i
        );
        return match ? match[1] : null;
      },
    },
  };
}
