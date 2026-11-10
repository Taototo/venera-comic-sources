/** @type {import('../_venera_.js')} */
class NnHanman extends ComicSource {
  name = "鸟鸟韩漫（18+）";
  key = "private_nnhanman";
  version = "1.0.7";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/nnhanman.js?v=1.0.7";
  _activeDomain = "";

  settings = {
    domain: {
      title: "域名",
      type: "select",
      options: [
        { value: "nnhm7.com", text: "nnhm7.com（推荐）" },
        { value: "nnhm81.com", text: "nnhm81.com（推荐）" },
        { value: "nnhanman.xyz", text: "nnhanman.xyz" },
        { value: "nnhanman66.com", text: "nnhanman66.com" },
        { value: "nnhanman88.com", text: "nnhanman88.com" },
        { value: "nnhm92.com", text: "nnhm92.com" },
        { value: "nnhm91.com", text: "nnhm91.com" },
        { value: "nnhm8.com", text: "nnhm8.com（备用）" },
      ],
      default: "nnhm7.com",
    },
  };

  normalizeDomain(value) {
    return String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }

  get configuredDomain() {
    return this.normalizeDomain(this.loadSetting("domain") || this.settings.domain.default);
  }

  get domainCandidates() {
    let candidates = [
      this._activeDomain,
      this.configuredDomain,
      "nnhm7.com",
      "nnhm81.com",
      "nnhm92.com",
      "nnhm91.com",
      "nnhm8.com",
      "nnhanman.xyz",
      "nnhanman66.com",
      "nnhanman88.com",
    ];
    let result = [];
    for (let domain of candidates) {
      domain = this.normalizeDomain(domain);
      if (domain && result.indexOf(domain) < 0) result.push(domain);
    }
    return result;
  }

  get baseUrl() {
    return `https://${this._activeDomain || this.configuredDomain}`;
  }

  headersFor(domain) {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
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
    value = String(value);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf("//") === 0) return `https:${value}`;
    let baseUrl = `https://${this.normalizeDomain(domain || this._activeDomain || this.configuredDomain)}`;
    return `${baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`;
  }

  pathOf(value) {
    let input = String(value || "/");
    let match = input.match(/^https?:\/\/[^/]+(\/.*)?$/i);
    return match ? match[1] || "/" : input;
  }

  async request(value) {
    let input = String(value || "/");
    let hostMatch = input.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
    let preferred = hostMatch ? this.normalizeDomain(hostMatch[1]) : "";
    let path = hostMatch ? hostMatch[2] || "/" : input;
    let candidates = this.domainCandidates;
    if (preferred) {
      candidates = [preferred].concat(candidates.filter((domain) => domain !== preferred));
    }
    let lastError = "";
    for (let domain of candidates) {
      try {
        let res = await Network.get(this.absoluteUrl(path, domain), this.headersFor(domain));
        if (res.status === 200) {
          this._activeDomain = domain;
          return res;
        }
        lastError = `Invalid status code: ${res.status}`;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || "无法连接到鸟鸟韩漫";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? node.attributes[name] || "" : "";
  }

  cleanTitle(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[《「『]\s*/, "")
      .replace(/\s*[》」』]$/, "")
      .trim();
  }

  fallbackTitle(id) {
    let path = this.pathOf(id).replace(/\/+$/, "");
    let value = path.substring(path.lastIndexOf("/") + 1);
    return this.cleanTitle(value.replace(/\.html$/i, ""));
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let href = this.attribute(node, "href");
      let match = href.match(/[?&]page=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll(".itemBox, .col_3_1 li")) {
      let link = item.querySelector("a[href^='/comic/'][href$='.html']");
      if (!link) continue;
      let id = this.attribute(link, "href");
      let titleNode = item.querySelector("a.title, a.txtA") || link;
      let title = this.attribute(titleNode, "title") || this.textOf(titleNode);
      let image = item.querySelector("img");
      let cover = this.attribute(image, "src") || this.attribute(image, "data-src");
      let latest = item.querySelector("a[href*='/chapter-']");
      if (!id || !title || !cover || seen[id]) continue;
      seen[id] = true;
      comics.push(new Comic({
        id: id,
        title: title,
        cover: this.absoluteUrl(cover),
        description: latest ? this.textOf(latest) : "",
      }));
    }
    return comics;
  }

  async loadList(path) {
    let res = await this.request(path);
    let document = new HtmlDocument(res.body);
    let result = { comics: this.parseComics(document), maxPage: this.parsePageCount(document) };
    document.dispose();
    return result;
  }

  explore = [{
    title: "鸟鸟韩漫",
    type: "multiPageComicList",
    load: async (page) => this.loadList(`/update${Number(page) > 1 ? `?page=${Number(page)}` : ""}`),
  }];

  category = {
    title: "鸟鸟韩漫",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: [
          "全部", "正妹", "恋爱", "出版漫画", "肉慾", "浪漫", "大尺度",
          "巨乳", "有夫之婦", "女大生", "狗血劇", "同居", "好友", "調教",
          "动作", "後宮", "不倫", "3D", "校園", "耽美", "日漫",
        ],
        itemType: "category",
        categoryParams: [
          "tag:all", "tag:正妹", "tag:恋爱", "tag:出版漫画", "tag:肉慾", "tag:浪漫",
          "tag:大尺度", "tag:巨乳", "tag:有夫之婦", "tag:女大生", "tag:狗血劇",
          "tag:同居", "tag:好友", "tag:調教", "tag:动作", "tag:後宮", "tag:不倫",
          "tag:3D", "tag:校園", "tag:耽美", "tag:日漫",
        ],
      },
      {
        name: "进度",
        type: "fixed",
        categories: ["全部", "已完结", "连载中"],
        itemType: "category",
        categoryParams: ["status:all", "status:completed", "status:serialized"],
      },
      {
        name: "排序",
        type: "fixed",
        categories: ["按时间", "按热度"],
        itemType: "category",
        categoryParams: ["sort:time", "sort:hits"],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let filters = { tag: "all", status: "all", sort: "time" };
      let value = String(param || "tag:all");
      let separator = value.indexOf(":");
      let type = separator >= 0 ? value.substring(0, separator) : "tag";
      let selected = separator >= 0 ? value.substring(separator + 1) : value;
      if (type === "tag" && selected) filters.tag = selected;
      if (type === "status" && selected) filters.status = selected;
      if (type === "sort" && selected) filters.sort = selected;
      let path = `/comics/${filters.tag}/ob/${filters.sort}/st/${filters.status}`;
      if (Number(page) > 1) path += `?page=${Number(page)}`;
      return this.loadList(path);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let encoded = encodeURIComponent(String(keyword || "").trim());
      let path = `/catalog.php?key=${encoded}`;
      if (Number(page) > 1) path += `&page=${Number(page)}`;
      return this.loadList(path);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let res = await this.request(id);
      let url = this.absoluteUrl(this.pathOf(id));
      let document = new HtmlDocument(res.body);
      let coverNode = document.querySelector("#Cover img");
      let cover = this.attribute(coverNode, "src") || this.attribute(coverNode, "data-src");
      let title = this.cleanTitle(this.textOf(document.querySelector(".txtItme2 h1")));
      if (!title) title = this.cleanTitle(this.textOf(document.querySelector(".txtItme2")));
      if (!title) title = this.cleanTitle(this.attribute(coverNode, "title"));
      if (!title) {
        let titleNode = document.querySelector("title");
        title = this.cleanTitle(this.textOf(titleNode).replace(/\s*[-|｜]\s*鸟鸟韩漫.*$/i, ""));
      }
      if (!title) title = this.fallbackTitle(id) || "未命名漫画";
      let author = "";
      for (let node of document.querySelectorAll(".sub_r .txtItme")) {
        if (!node.querySelector("a") && !node.querySelector(".date")) {
          author = this.textOf(node).replace(/^(作者|作者名)\s*[：:]/, "").trim();
          break;
        }
      }
      let description = this.textOf(document.querySelector(".txtDesc"));
      let tags = [];
      for (let node of document.querySelectorAll(".sub_r a[href]")) {
        let href = this.attribute(node, "href");
        if (href.indexOf("/comics/") < 0 && href.indexOf("/search/") < 0) continue;
        let value = this.textOf(node);
        if (value && tags.indexOf(value) < 0) tags.push(value);
      }
      let statusText = this.textOf(document.querySelector(".sub_r .date"));
      let statusMatch = statusText.match(/^(连载中|連載中|连载|連載|已完结|已完結|完结|完結|停更|暂停|暫停)/i);
      let status = statusMatch ? statusMatch[1] : "";
      let updateTime = statusText.replace(status, "").trim();
      let chapterEntries = [];
      for (let node of document.querySelectorAll("#mh-chapter-list-ol-0 a[href*='/chapter-']")) {
        let href = this.attribute(node, "href");
        let chapterTitle = this.textOf(node);
        if (!href || !chapterTitle) continue;
        let chapterMatch = chapterTitle.match(/第\s*(\d+(?:\.\d+)?)\s*(?:話|话|回|集)?/i);
        chapterEntries.push({
          href: href,
          title: chapterTitle,
          number: chapterMatch ? Number(chapterMatch[1]) : NaN,
          order: chapterEntries.length,
        });
      }
      chapterEntries.sort((a, b) => {
        let aNumber = Number.isFinite(a.number);
        let bNumber = Number.isFinite(b.number);
        if (aNumber && bNumber && a.number !== b.number) return a.number - b.number;
        if (aNumber !== bNumber) return aNumber ? -1 : 1;
        return a.order - b.order;
      });
      let chapters = new Map();
      for (let chapter of chapterEntries) chapters.set(chapter.href, chapter.title);
      document.dispose();
      let detailTags = {
        "作者": author ? [author] : [],
        "分类": tags,
      };
      if (status) detailTags["状态"] = [status];
      if (updateTime) detailTags["更新时间"] = [updateTime];
      return new ComicDetails({
        title: title,
        subTitle: author,
        cover: this.absoluteUrl(cover),
        description: description,
        tags: detailTags,
        chapters: chapters,
        updateTime: updateTime,
        url: url,
      });
    },

    loadEp: async (comicId, epId) => {
      let res = await this.request(epId || comicId);
      let document = new HtmlDocument(res.body);
      let images = [];
      for (let node of document.querySelectorAll("#currentCache img[data-src], .view-imgBox img[data-src]")) {
        let image = this.attribute(node, "data-src") || this.attribute(node, "src");
        image = this.absoluteUrl(image);
        if (image && images.indexOf(image) < 0) images.push(image);
      }
      document.dispose();
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    onImageLoad: (url, comicId, epId) => ({
      headers: Object.assign({}, this.headers, {
        Referer: epId ? this.absoluteUrl(this.pathOf(epId)) : `${this.baseUrl}/`,
      }),
    }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["nnhm7.com", "nnhm81.com", "nnhm92.com", "nnhm91.com", "nnhm8.com", "nnhanman.xyz", "nnhanman66.com", "nnhanman88.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/comic\/[^?#]+\.html)/i);
        return match ? match[1] : null;
      },
    },
  };
}
