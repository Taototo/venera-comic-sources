/** @type {import('../_venera_.js')} */
class PrivateTianyaVideo extends ComicSource {
  type = "video";
  name = "天涯资源（私人）";
  key = "private_tianya_video";
  version = "1.1.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/tianya_video.js";

  settings = {
    api: {
      title: "JSON 接口",
      type: "select",
      options: [
        {
          value: "https://ty.tyyszy5.com/api.php/provide/vod/",
          text: "大陆优先线路",
        },
        {
          value: "https://tyyszyapi.com/api.php/provide/vod/",
          text: "天涯主线路",
        },
      ],
      default: "https://ty.tyyszy5.com/api.php/provide/vod/",
    },
  };

  get apiUrl() {
    let value = this.loadSetting("api") || this.settings.api.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/[?&]+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://tyyszy.com/",
    };
  }

  requestUrl(params) {
    let query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${this.apiUrl}?${query}`;
  }

  async request(params) {
    let res = await Network.get(this.requestUrl(params), this.headers);
    if (res.status !== 200) throw `天涯资源接口状态异常: ${res.status}`;
    let text = String(res.body || "").trim();
    if (!text || text[0] !== "{") throw "天涯资源返回了无法解析的数据";
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw "天涯资源返回了无效 JSON";
    }
    if (data.code !== undefined && Number(data.code) !== 1) {
      throw data.msg || "天涯资源接口返回错误";
    }
    return data;
  }

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks]
      .filter((value) => value && String(value).trim())
      .join(" · ");
    return new Comic({
      id: String(item.vod_id),
      title: String(item.vod_name),
      subTitle: subtitle,
      cover: String(item.vod_pic || item.vod_pic_thumb || ""),
      description: String(item.vod_blurb || item.vod_content || subtitle),
    });
  }

  parseList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toComic(item);
      if (comic) comics.push(comic);
    }
    let maxPage = parseInt(data.pagecount, 10) || 1;
    return { comics: comics, maxPage: maxPage };
  }

  parseFilterOptions(options) {
    let values = Array.isArray(options) ? options : [];
    let valueAt = (index) => {
      let value = values[index];
      return value && String(value) !== "all" ? String(value) : "";
    };
    let params = {};
    let year = valueAt(0);
    if (year) {
      params.year = /^\d{4}s$/i.test(year)
        ? `${year.substring(0, 4)}-${Number(year.substring(0, 4)) + 9}`
        : year;
    }
    let rating = valueAt(1);
    if (rating) params.vod_score = rating;
    let sort = valueAt(2);
    if (sort) params.order = sort;
    let genre = valueAt(3);
    if (genre) params.class = genre;
    let region = valueAt(4);
    if (region) params.area = region;
    return params;
  }

  async loadList(typeId, page, keyword, options) {
    let params = { ac: "list", pg: Number(page) || 1 };
    if (typeId) params.t = typeId;
    if (keyword) params.wd = keyword;
    Object.assign(params, this.parseFilterOptions(options));
    return this.parseList(await this.request(params));
  }

  extractEntries(item) {
    let groups = String(item && item.vod_play_url || "").split("$$$");
    let playFrom = String(item && item.vod_play_from || "").split("$$$");
    let grouped = {};
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      let group = groups[groupIndex];
      let route = (playFrom[groupIndex] || "").trim() ||
        (groups.length > 1 ? `线路${groupIndex + 1}` : "默认线路");
      let chapters = grouped[route] || {};
      for (let entry of group.split("#")) {
        let separator = entry.indexOf("$");
        if (separator < 0) continue;
        let label = entry.substring(0, separator).trim() || "播放";
        let url = entry.substring(separator + 1).trim();
        if (!/^https?:\/\//i.test(url)) continue;
        if (!/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(url)) continue;
        if (!chapters[url]) chapters[url] = label;
      }
      if (Object.keys(chapters).length > 0) grouped[route] = chapters;
    }
    if (Object.keys(grouped).length === 1) return grouped[Object.keys(grouped)[0]];
    return grouped;
  }

  chapterCount(chapters) {
    let count = 0;
    for (let key of Object.keys(chapters || {})) {
      let value = chapters[key];
      count += value && typeof value === "object" ? Object.keys(value).length : 1;
    }
    return count;
  }

  extractStream(value) {
    let text = String(value || "")
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=");
    let match = text.match(
      /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/i
    );
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  explore = [
    {
      title: "天涯资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["国产剧", "13"],
          ["电影", "1"],
          ["动漫", "29"],
          ["综艺", "25"],
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
    title: "天涯资源",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: [
          "最新更新",
          "电影",
          "电视剧",
          "综艺",
          "动漫",
          "动作片",
          "喜剧片",
          "爱情片",
          "科幻片",
          "恐怖片",
          "剧情片",
          "战争片",
          "国产剧",
          "欧美剧",
          "韩国剧",
          "日本剧",
          "港台剧",
          "台湾剧",
          "泰国剧",
          "纪录片",
          "海外剧",
          "大陆综艺",
          "日韩综艺",
          "港台综艺",
          "欧美综艺",
          "国产动漫",
          "日韩动漫",
          "欧美动漫",
          "动画片",
          "港台动漫",
          "海外动漫",
          "演唱会",
          "短剧",
          "伦理",
          "有声动漫",
          "女频恋爱",
          "反转爽剧",
          "古装仙侠",
          "年代穿越",
          "脑洞悬疑",
          "现代都市",
          "Netflix自制剧",
          "擦边短剧",
        ],
        itemType: "category",
        categoryParams: [
          "", "1", "2", "3", "4", "6", "7", "8", "9", "10", "11", "12",
          "13", "14", "15", "16", "17", "18", "19", "20", "23", "25", "26",
          "27", "28", "29", "30", "31", "39", "44", "45", "47",
          "54", "55", "63", "64", "65", "66", "67", "68", "69", "72", "73",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || ""), page || 1, "", options),
    optionList: [
      {
        label: "年份",
        options: [
          "all-全部", "2026-2026", "2025-2025", "2024-2024", "2023-2023",
          "2022-2022", "2021-2021", "2020-2020", "2020s-2020年代",
          "2010s-2010年代", "2000s-2000年代", "1990s-90年代", "1980s-80年代",
          "1970s-70年代", "1960s-60年代",
        ],
      },
      {
        label: "评分",
        options: ["all-全部", "6-6 分以上", "7-7 分以上", "8-8 分以上", "9-9 分以上"],
      },
      {
        label: "排序",
        options: [
          "time.desc-最新入库", "time.asc-最早入库", "year.desc-年份从新到旧",
          "year.asc-年份从旧到新", "score.desc-评分从高到低", "score.asc-评分从低到高",
        ],
      },
      {
        label: "体裁",
        options: [
          "all-全部", "动作-动作", "冒险-冒险", "动画-动画", "传记-传记", "喜剧-喜剧",
          "犯罪-犯罪", "纪录-纪录", "剧情-剧情", "家庭-家庭", "奇幻-奇幻", "历史-历史",
          "恐怖-恐怖", "同性-同性", "武侠-武侠", "音乐-音乐", "悬疑-悬疑", "真人秀-真人秀",
          "爱情-爱情", "科幻-科幻", "短片-短片", "运动-运动", "惊悚-惊悚", "战争-战争", "西部-西部",
        ],
      },
      {
        label: "地区",
        options: [
          "all-全部", "中国大陆-中国大陆", "中国香港-中国香港", "中国台湾-中国台湾",
          "美国-美国", "日本-日本", "韩国-韩国", "英国-英国", "法国-法国", "泰国-泰国",
          "加拿大-加拿大", "德国-德国", "印度-印度", "西班牙-西班牙", "意大利-意大利",
          "澳大利亚-澳大利亚", "俄罗斯-俄罗斯", "新加坡-新加坡", "马来西亚-马来西亚",
          "菲律宾-菲律宾", "印度尼西亚-印度尼西亚", "越南-越南",
        ],
      },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      // The published Tianya API explicitly returns "暂不支持搜索" for wd.
      // Keep the source usable without turning that expected limitation into
      // a network error in the app.
      return { comics: [], maxPage: 1 };
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: (url) => ({
      url: url,
      headers: this.headers,
    }),

    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "天涯资源没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "天涯资源"),
        subTitle: String(item.vod_remarks || ""),
        cover: String(item.vod_pic || ""),
        description: String(item.vod_content || item.vod_blurb || ""),
        tags: { 类型: tags },
        chapters: chapters,
        url: this.requestUrl({ ac: "detail", ids: String(id) }),
        maxPage: this.chapterCount(chapters),
      });
    },

    loadEp: async (comicId, epId) => {
      let candidate = String(epId || "");
      let videoUrl = this.extractStream(candidate);
      if (!videoUrl) {
        let res = await Network.get(candidate, this.headers);
        if (res.status !== 200) throw `天涯资源播放页状态异常: ${res.status}`;
        videoUrl = this.extractStream(res.body);
      }
      if (!videoUrl) throw "天涯资源当前集数没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "天涯资源",
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
