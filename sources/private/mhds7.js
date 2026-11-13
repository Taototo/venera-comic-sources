/** @type {import('../_venera_.js')} */
class PrivateMhds7 extends ComicSource {
  name = "漫画大湿（18+）";
  key = "private_mhds7";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/mhds7.js?v=1.0.0";

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "mhds7.com",
    },
  };

  get baseUrl() {
    let domain = this.loadSetting("domain") || this.settings.domain.default;
    domain = String(domain).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return "https://" + domain;
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: this.baseUrl + "/",
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    value = String(value);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf("//") === 0) return "https:" + value;
    return this.baseUrl + (value.indexOf("/") === 0 ? "" : "/") + value;
  }

  async request(path) {
    let url = /^https?:\/\//i.test(String(path || ""))
      ? String(path)
      : this.absoluteUrl(path || "/");
    let res = await Network.get(url, this.headers);
    if (res.status !== 200) throw "请求失败: " + res.status;
    return res;
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? node.attributes[name] || "" : "";
  }

  optionValue(value, fallback) {
    let result = String(value || "");
    let separator = result.indexOf("-");
    if (separator >= 0) result = result.substring(0, separator);
    return result || fallback;
  }

  pagePath(path, page) {
    let current = Number(page) || 1;
    let value = String(path || "/").replace(/\/+$/, "");
    return current <= 1 ? value : value + "/page/" + current;
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let match = this.attribute(node, "href").match(/\/page\/(\d+)(?:[\/?#]|$)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let item of document.querySelectorAll(".gm-list .item")) {
      let link = item.querySelector("a.link[href*='/manhua/']");
      if (!link) continue;
      let id = this.attribute(link, "href");
      let titleNode = item.querySelector("a.title[href*='/manhua/']") || link;
      let title = this.attribute(titleNode, "title") || this.textOf(titleNode);
      let image = item.querySelector("img");
      let cover =
        this.attribute(image, "data-src") ||
        this.attribute(image, "src") ||
        this.attribute(link, "data-src");
      let subtitle = this.textOf(item.querySelector(".tag2"));
      if (!id || !title || !cover || seen[id]) continue;
      seen[id] = true;
      comics.push(
        new Comic({
          id: id,
          title: title,
          subTitle: subtitle,
          cover: this.absoluteUrl(cover),
          description: subtitle,
        })
      );
    }
    return comics;
  }

  async loadList(path, page) {
    let res = await this.request(this.pagePath(path, page));
    let document = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(document),
      maxPage: this.parsePageCount(document),
    };
    document.dispose();
    return result;
  }

  explore = [
    {
      title: "漫画大湿",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["推荐", "/new/recommend"],
          ["最近更新", "/new"],
          ["新书发布", "/new/newbook"],
          ["周排行", "/top"],
          ["已完结", "/cata/all/ob/time/st/completed"],
        ];
        let result = [];
        for (let section of sections) {
          let page = await this.loadList(section[1], 1);
          if (page.comics.length > 0) {
            result.push({
              title: section[0],
              comics: page.comics,
              viewMore: "category:" + section[0] + "@" + section[1],
            });
          }
        }
        return result;
      },
    },
  ];

  category = {
    title: "漫画大湿",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: [
          "全部",
          "正妹",
          "恋爱",
          "浪漫",
          "女大生",
          "狗血劇",
          "肉慾",
          "大尺度",
          "出版漫画",
          "3D",
          "有夫之婦",
        ],
        itemType: "category",
        categoryParams: [
          "all",
          "正妹",
          "恋爱",
          "浪漫",
          "女大生",
          "狗血劇",
          "肉慾",
          "大尺度",
          "出版漫画",
          "3D",
          "有夫之婦",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let value = String(param || "all");
      if (value.indexOf("/") === 0) return this.loadList(value, page);
      let status = this.optionValue(options && options[0], "all");
      let order = this.optionValue(options && options[1], "time");
      let path =
        "/cata/" +
        encodeURIComponent(value || "all") +
        "/ob/" +
        encodeURIComponent(order) +
        "/st/" +
        encodeURIComponent(status);
      return this.loadList(path, page);
    },
    optionList: [
      {
        label: "进度",
        options: ["all-全部", "completed-已完结", "serialized-连载中"],
      },
      {
        label: "排序",
        options: ["time-按时间", "hits-按热度"],
      },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      let current = Number(page) || 1;
      let path =
        current <= 1
          ? "/cata.php?key=" + encodeURIComponent(value)
          : "/search/" + encodeURIComponent(value) + "/page/" + current;
      return this.loadList(path, 1);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await this.request(url);
      let document = new HtmlDocument(res.body);
      let title = this.textOf(document.querySelector(".gm-vod h1.title"));
      let coverNode = document.querySelector(".gm-vod img");
      let cover =
        this.attribute(coverNode, "data-src") || this.attribute(coverNode, "src");
      let infoNodes = document.querySelectorAll(".gm-vod .info");
      let author = "";
      let status = "";
      let updateTime = "";
      let description = "";
      for (let node of infoNodes) {
        let value = this.textOf(node);
        if (/^作者\s*[：:]/.test(value)) {
          author = this.textOf(node.querySelector("a"));
        } else if (/^(進度|进度)\s*[：:]/.test(value)) {
          let statusLine = value.replace(/^(進度|进度)\s*[：:]\s*/, "");
          let match = statusLine.match(
            /(已完结|已完結|连载中|連載中|更新中|连载|連載|完结|完結|停更)/i
          );
          status = match ? match[1] : "";
          updateTime = statusLine.replace(status, "").trim();
        } else if (/^(劇情|剧情)\s*[：:]/.test(value)) {
          description = value.replace(/^(劇情|剧情)\s*[：:]\s*/, "");
        }
      }

      let categories = [];
      for (let node of document.querySelectorAll(".gm-vod .info a[href^='/cata/']")) {
        let value = this.textOf(node);
        if (value && categories.indexOf(value) < 0) categories.push(value);
      }

      let chapterEntries = [];
      let chapterNodes = document.querySelectorAll(
        "#dom-source .source .list a[href*='/manhua/']"
      );
      for (let node of chapterNodes) {
        let chapterId = this.attribute(node, "href");
        let chapterTitle = this.attribute(node, "title") || this.textOf(node);
        if (!chapterId || !chapterTitle) continue;
        let numberMatch = chapterTitle.match(/第\s*(\d+(?:\.\d+)?)/i);
        chapterEntries.push({
          id: chapterId,
          title: chapterTitle,
          number: numberMatch ? Number(numberMatch[1]) : NaN,
          order: chapterEntries.length,
        });
      }
      chapterEntries.sort((a, b) => {
        let aHasNumber = Number.isFinite(a.number);
        let bHasNumber = Number.isFinite(b.number);
        if (aHasNumber && bHasNumber && a.number !== b.number) {
          return a.number - b.number;
        }
        if (aHasNumber !== bHasNumber) return aHasNumber ? -1 : 1;
        return b.order - a.order;
      });
      let chapters = new Map();
      for (let chapter of chapterEntries) chapters.set(chapter.id, chapter.title);

      let detailTags = { 作者: author ? [author] : [], 分类: categories };
      if (status) detailTags["状态"] = [status];
      if (updateTime) detailTags["更新时间"] = [updateTime];
      let details = new ComicDetails({
        title: title || "漫画大湿",
        subTitle: author,
        cover: this.absoluteUrl(cover),
        description: description,
        tags: detailTags,
        chapters: chapters,
        updateTime: updateTime,
        url: url,
      });
      document.dispose();
      return details;
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await this.request(url);
      let document = new HtmlDocument(res.body);
      let imageNodes = document.querySelectorAll(".gm-read img[data-src]");
      let images = [];
      for (let node of imageNodes) {
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
        Referer: epId ? this.absoluteUrl(epId) : this.baseUrl + "/",
      }),
    }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["mhds7.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/manhua\/\d+)/i);
        return match ? match[1] : null;
      },
    },
  };
}
