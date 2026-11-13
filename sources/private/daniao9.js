/** @type {import('../_venera_.js')} */
class PrivateDaniao9 extends ComicSource {
  name = "大鸟禁漫（18+）";
  key = "private_daniao9";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/daniao9.js?v=1.0.0";

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "daniao9.com",
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
    let items = document.querySelectorAll(".vodlist_item");
    if (items.length === 0) items = document.querySelectorAll(".ranklist_item");
    for (let item of items) {
      let link =
        item.querySelector("a.vodlist_thumb[href*='/manga-detail/']") ||
        item.querySelector("a[href*='/manga-detail/']");
      if (!link) continue;

      let id = this.attribute(link, "href");
      let titleNode = item.querySelector(".vodlist_title a[href]") || link;
      let title = this.attribute(titleNode, "title") || this.textOf(titleNode);
      let cover =
        this.attribute(link, "data-original") ||
        this.attribute(link, "data-src") ||
        this.attribute(link, "src");
      if (!cover) {
        let image = item.querySelector("img");
        cover =
          this.attribute(image, "data-original") ||
          this.attribute(image, "data-src") ||
          this.attribute(image, "src");
      }
      let subtitle =
        this.textOf(item.querySelector(".vodlist_sub")) ||
        this.textOf(item.querySelector(".pic_text"));
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
      title: "大鸟禁漫",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最近更新", "/new-manga"],
          ["热门漫画", "/manga-cata/all/ob/hits/st/all"],
          ["已完结", "/manga-cata/all/ob/time/st/completed"],
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
    title: "大鸟禁漫",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["全部", "韩漫", "日漫", "3D漫画", "真人", "短篇"],
        itemType: "category",
        categoryParams: ["all", "韩漫", "日漫", "3D漫画", "真人", "短篇"],
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
        "/manga-cata/" +
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
        options: ["all-全部", "completed-已完结", "serialized-更新中"],
      },
      {
        label: "排序",
        options: ["time-按时间", "hits-按阅读"],
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
          : "/manga-search/" + encodeURIComponent(value) + "/page/" + current;
      return this.loadList(path, 1);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await this.request(url);
      let document = new HtmlDocument(res.body);
      let title = this.textOf(document.querySelector(".content_top h1.title"));
      let coverNode = document.querySelector(".content_thumb .vodlist_thumb");
      let cover =
        this.attribute(coverNode, "data-original") ||
        this.attribute(coverNode, "data-src");
      let description = this.textOf(document.querySelector(".content_min li.desc"));
      description = description.replace(/^简介\s*[：:]\s*/, "");

      let author = "";
      let categories = [];
      let tags = [];
      for (let item of document.querySelectorAll(".content_min li.data")) {
        let text = this.textOf(item);
        if (/^作者\s*[：:]/.test(text)) {
          let authorNode = item.querySelector("a");
          author = this.textOf(authorNode);
        }
        for (let node of item.querySelectorAll("a[href]")) {
          let href = this.attribute(node, "href");
          let value = this.textOf(node);
          if (!value) continue;
          if (href.indexOf("/manga-cata/") >= 0 && categories.indexOf(value) < 0) {
            categories.push(value);
          } else if (
            href.indexOf("/manga-search/") >= 0 &&
            !/^作者\s*[：:]/.test(text) &&
            tags.indexOf(value) < 0
          ) {
            tags.push(value);
          }
        }
      }

      let statusLine = this.textOf(document.querySelector(".content_top font"));
      let statusMatch = statusLine.match(
        /(已完结|已完結|连载中|連載中|更新中|连载|連載|完结|完結|停更)/i
      );
      let status = statusMatch ? statusMatch[1] : "";
      let updateTime = statusLine.replace(status, "").trim();

      let chapterEntries = [];
      let chapterNodes = document.querySelectorAll(
        "#playlistbox a[href*='/manga-read/']"
      );
      if (chapterNodes.length === 0) {
        chapterNodes = document.querySelectorAll(
          ".content_playlist a[href*='/manga-read/']"
        );
      }
      let seen = {};
      for (let node of chapterNodes) {
        let chapterId = this.attribute(node, "href");
        let chapterTitle = this.attribute(node, "title") || this.textOf(node);
        if (!chapterId || !chapterTitle || seen[chapterId]) continue;
        seen[chapterId] = true;
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
        return a.order - b.order;
      });
      let chapters = new Map();
      for (let chapter of chapterEntries) chapters.set(chapter.id, chapter.title);

      let detailTags = {
        作者: author ? [author] : [],
        分类: categories,
        标签: tags,
      };
      if (status) detailTags["状态"] = [status];
      if (updateTime) detailTags["更新时间"] = [updateTime];
      let details = new ComicDetails({
        title: title || "大鸟禁漫",
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
      let imageNodes = document.querySelectorAll(
        "#m_r_imgbox_0 img[data-src], .m_r_imgbox img[data-src], img[data-index][data-src]"
      );
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
      domains: ["daniao9.com"],
      linkToId: (url) => {
        let match = String(url || "").match(
          /^(https?:\/\/[^/]+\/manga-detail\/\d+)/i
        );
        return match ? match[1] : null;
      },
    },
  };
}
