import { storage } from "./firebase-config";
import {
  ref,
  listAll,
  getDownloadURL,
  StorageReference,
} from "firebase/storage";

async function ImageUrls(): Promise<string[]> {
  try {
    const folderRef: StorageReference = ref(storage, "images");
    const res = await listAll(folderRef);

    const urlPromises: Promise<string>[] = res.items.map((itemRef) =>
      getDownloadURL(itemRef),
    );

    const urls: string[] = await Promise.all(urlPromises);
    return urls;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export default ImageUrls;

// testing to get subfolder images
// import { storage } from "./firebase-config";
// import {
//   ref,
//   listAll,
//   getDownloadURL,
//   StorageReference,
// } from "firebase/storage";
//
// interface FolderImages {
//   [folderName: string]: string[];
// }
//
//
// async function fetchFolderImages(
//   folderRef: StorageReference,
// ): Promise<FolderImages> {
//   try {
//     const res = await listAll(folderRef);
//     const result: FolderImages = {};
//
//     // Collect current folder's images first
//     const fileUrls: string[] = await Promise.all(
//       res.items.map((itemRef) => getDownloadURL(itemRef)),
//     );
//     if (fileUrls.length > 0) {
//       result[folderRef.name] = fileUrls;
//     }
//
//     // Recursively fetch images from subfolders
//     for (const subFolderRef of res.prefixes) {
//       const subFolderImages = await fetchFolderImages(subFolderRef);
//       Object.assign(result, subFolderImages);
//     }
//
//     return result;
//   } catch (err) {
//     console.log("Error in fetchFolderImages:", err);
//     return {};
//   }
// }
//
// async function ImageUrls(): Promise<FolderImages> {
//   try {
//     const rootRef: StorageReference = ref(storage, "images");
//     const folderImages = await fetchFolderImages(rootRef);
//     return folderImages;
//   } catch (err) {
//     console.log(err);
//     return {};
//   }
// }

// export default ImageUrls;
