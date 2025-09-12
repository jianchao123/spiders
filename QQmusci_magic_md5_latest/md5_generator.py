import hashlib
import base64
import re

def get_sha1(instring: str) -> str:
    sha1 = hashlib.sha1()
    sha1.update(instring.encode('utf-8'))
    return sha1.hexdigest()

def get_sign(in_data:str)-> str:
    sha1_data = get_sha1(data).upper() 
    array2=[23,14,6,36,16,48,7,19]
    str1 = "".join(list(map(lambda x:sha1_data[x] if x <40 else "", array2)))
    array3=[16,1,32,12,19,27,8,5]
    str2 = "".join(list(map(lambda x:sha1_data[x] if x<40 else "", array3)))
    str_to_num = {"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15} 
    array1=[89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179]
    result_array =[]
    for i in range(20):
        r1= str_to_num[sha1_data[2*i]]* 16 
        r2 = str_to_num[sha1_data[2*i+1]]+ r1 
        result = r2 ^ array1[i]
        result_array.append(result)
    result = base64.b64encode(bytearray(result_array)).decode('utf-8')
    result = re.sub(r"[/+=]", "",result)
    result = ("zzc" + str1 + result + str2).lower() 
    return result
    
if __name__ == '__main__': 
    data ="123456"
    print(get_sign(data))
