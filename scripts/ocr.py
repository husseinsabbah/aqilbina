# scripts/ocr.py
import sys
import easyocr

def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_path>")
        sys.exit(1)
    image_path = sys.argv[1]
    
    # Initialiser EasyOCR (langue française, CPU)
    reader = easyocr.Reader(['fr'], gpu=False)
    
    # Lire le texte de l'image (detail=0 retourne seulement le texte)
    result = reader.readtext(image_path, detail=0)
    
    # Afficher le texte extrait, ligne par ligne
    print("\n".join(result))

if __name__ == "__main__":
    main()