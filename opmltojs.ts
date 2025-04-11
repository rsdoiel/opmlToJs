// opmltojs.ts

// Credit: This code is based on Dave Winer's opmltojs.js
// GitHub Repository: https://github.com/scripting/opmltojs

const myProductName = "opmltojs";
const myVersion = "0.4.14";

import * as xml2js from "npm:xml2js";
import * as utils from "npm:daveutils";

interface OutlineNode {
  text?: string;
  type?: string;
  url?: string;
  subs?: OutlineNode[];
  [key: string]: any;
}

interface OPML {
  opml: {
    head?: { [key: string]: any };
    body?: { subs?: OutlineNode[] };
  };
}

/**
 * Checks if a value is a scalar (not an object).
 * @param obj - The value to check.
 * @returns True if the value is a scalar, false otherwise.
 */
function isScalar(obj: any): boolean {
  return typeof obj !== "object";
}

/**
 * Visits all subs in the outline and applies a visitor function.
 * @param subs - The subs to visit.
 * @param visit - The visitor function to apply.
 * @returns True if all visits are successful, false otherwise.
 */
export function visitSubs(
  subs: OutlineNode[],
  visit: (sub: OutlineNode) => boolean,
): boolean {
  if (subs !== undefined) {
    for (const sub of subs) {
      if (!visit(sub)) {
        return false;
      }
      if (sub.subs !== undefined && !visitSubs(sub.subs, visit)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Parses OPML text and returns a JavaScript object representing the OPML structure.
 * @param opmltext - The OPML text to parse.
 * @returns A promise that resolves to the parsed OPML object.
 */
export async function parse(
  opmltext: string,
): Promise<OPML> {
  return new Promise((resolve, reject) => {
    function addGenerator(theOpml: any): void {
      try {
        theOpml.head.generator = `${myProductName} v${myVersion}`;
      } catch (err) {
        // Ignore error
      }
    }

    function convert(sourcestruct: any, deststruct: any): void {
      const atts = sourcestruct["$"];
      if (atts !== undefined) {
        for (const x in atts) {
          if (x !== "subs") {
            deststruct[x] = atts[x];
          }
        }
        delete sourcestruct["$"];
      }
      for (const x in sourcestruct) {
        const obj = sourcestruct[x];
        if (isScalar(obj)) {
          deststruct[x] = obj;
        } else {
          if (x === "outline") {
            if (deststruct.subs === undefined) {
              deststruct.subs = [];
            }
            if (Array.isArray(obj)) {
              for (const item of obj) {
                const newobj = {};
                convert(item, newobj);
                deststruct.subs.push(newobj);
              }
            } else {
              const newobj = {};
              convert(obj, newobj);
              deststruct.subs.push(newobj);
            }
          } else {
            deststruct[x] = {};
            convert(obj, deststruct[x]);
          }
        }
      }
    }

    xml2js.parseString(
      opmltext,
      { explicitArray: false },
      (err: Error | null, jstruct: any) => {
        if (err) {
          reject(err);
        } else {
          if (jstruct == null) {
            reject(new Error("There was an error parsing the OPML text."));
          } else {
            const theOutline: OPML = { opml: {} };
            convert(jstruct.opml, theOutline.opml);
            addGenerator(theOutline.opml);
            if (isScalar(theOutline.opml.head)) {
              theOutline.opml.head = {};
            }
            if (isScalar(theOutline.opml.body)) {
              theOutline.opml.body = {};
            }
            resolve(theOutline);
          }
        }
      },
    );
  });
}

/**
 * Converts an OPML object back into an OPML text string.
 * @param theOutline - The OPML object to convert.
 * @returns The OPML text string.
 */
export function opmlify(theOutline: OPML): string {
  let opmltext = "";
  let indentlevel = 0;

  function add(s: string): void {
    opmltext += utils.filledString("\t", indentlevel) + s + "\n";
  }

  function addSubs(subs: OutlineNode[]): void {
    if (subs !== undefined) {
      for (const sub of subs) {
        let atts = "";
        for (const x in sub) {
          if (x !== "subs") {
            atts += ` ${x}="${utils.encodeXml(sub[x])}"`;
          }
        }
        if (sub.subs === undefined) {
          add(`<outline${atts} />`);
        } else {
          add(`<outline${atts}>`);
          indentlevel++;
          addSubs(sub.subs);
          add("</outline>");
          indentlevel--;
        }
      }
    }
  }

  add('<?xml version="1.0" encoding="UTF-8"?>');
  add('<opml version="2.0">');
  indentlevel++;

  // Remove generator, RSD 2025-04-05
  if (theOutline.opml !== undefined &&
    theOutline.opml.head !== undefined &&
    theOutline.opml.head.generator !== undefined)  {
    delete theOutline.opml.head.generator;
  }
  // Head section
  add("<head>");
  indentlevel++;
  for (const x in theOutline.opml.head) {
    add(`<${x}>${theOutline.opml.head[x]}</${x}>`);
  }
  add("</head>");
  indentlevel--;

  // Body section
  add("<body>");
  indentlevel++;
  addSubs(theOutline.opml.body?.subs ?? []);
  add("</body>");
  indentlevel--;

  add("</opml>");
  indentlevel--;

  return opmltext;
}
